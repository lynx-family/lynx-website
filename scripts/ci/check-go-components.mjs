import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { parseDocumentation } from './documentation-parser.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const docExtensions = new Set(['.md', '.mdx']);

const approvedImageOrigins = new Set(['https://lf-lynx.tiktok-cdns.com']);
const approvedImageOriginsText = [...approvedImageOrigins].join(', ');

/**
 * Normalize a host path before it is compared with Git-style document paths.
 *
 * @param {string} value A native filesystem path.
 * @returns {string} The path with POSIX separators.
 */
function toPosix(value) {
  return value.split(path.sep).join('/');
}

// Component discovery

/**
 * Walk both the Markdown tree and ESTree attached by the MDX parser. MDX uses
 * the former for top-level nodes and the latter for JavaScript expressions.
 */
function* typedNodes(node) {
  yield node;
  if (node.data?.estree) {
    yield* typedNodes(node.data.estree);
  }
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string'
      ) {
        yield* typedNodes(child);
      }
    }
  }
}

/**
 * Build a resolver using the same TypeScript path and extension rules as the
 * documentation source. Export symbols are traced to the canonical Go module,
 * so import aliases and re-exports share one component identity.
 *
 * @param {string} root Repository root containing tsconfig.json and src/.
 * @returns {(source: string, importer: string) =>
 *   {named: boolean, default: boolean} | undefined} Import resolver.
 */
export function createGoImportResolver(root = repoRoot) {
  const configPath = path.join(root, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(
      `could not read TypeScript configuration ${configPath}: ${ts.flattenDiagnosticMessageText(config.error.messageText, '\n')}`,
    );
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    root,
    undefined,
    configPath,
  );
  if (parsedConfig.errors.length > 0) {
    throw new Error(
      `could not parse TypeScript configuration ${configPath}: ${ts.flattenDiagnosticMessageText(parsedConfig.errors[0].messageText, '\n')}`,
    );
  }

  const canonicalGoFile = path.normalize(
    path.resolve(root, 'src/components/go/Go.tsx'),
  );
  const program = ts.createProgram({
    // The Go identity is owned by source modules. Exclude generated docs and
    // public data from the semantic program so each CLI invocation remains
    // proportional to the component source tree.
    rootNames: ts.sys.readDirectory(
      path.join(root, 'src'),
      ['.ts', '.tsx', '.d.ts'],
      undefined,
      undefined,
      undefined,
    ),
    options: parsedConfig.options,
  });
  const checker = program.getTypeChecker();

  /**
   * Check whether an exported symbol aliases the canonical Go implementation.
   */
  function symbolResolvesToGo(symbol) {
    const resolvedSymbol =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    return (resolvedSymbol.declarations ?? []).some(
      (declaration) =>
        path.normalize(declaration.getSourceFile().fileName) ===
        canonicalGoFile,
    );
  }

  /**
   * Check one export name without treating an unrelated component named Go as
   * the documentation component.
   */
  function moduleExportsGo(resolvedFileName, exportName) {
    const sourceFile = program.getSourceFile(resolvedFileName);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) {
      return false;
    }
    const exportedSymbol = checker
      .getExportsOfModule(moduleSymbol)
      .find((symbol) => symbol.name === exportName);
    return exportedSymbol ? symbolResolvesToGo(exportedSymbol) : false;
  }

  return function resolveGoImport(source, importer) {
    const importerPath = path.isAbsolute(importer)
      ? importer
      : path.resolve(root, importer);
    const resolvedModule = ts.resolveModuleName(
      source,
      importerPath,
      parsedConfig.options,
      ts.sys,
    ).resolvedModule;
    if (!resolvedModule) {
      return undefined;
    }

    return {
      named: moduleExportsGo(resolvedModule.resolvedFileName, 'Go'),
      default: moduleExportsGo(resolvedModule.resolvedFileName, 'default'),
    };
  };
}

let defaultGoImportResolver;

/**
 * Reuse the semantic resolver across all documents in one checker process.
 */
function resolveDefaultGoImport(source, importer) {
  defaultGoImportResolver ??= createGoImportResolver();
  return defaultGoImportResolver(source, importer);
}

/**
 * Resolve imported Go bindings through the configured module resolver.
 * Aliases retain their local JSX names, while unrelated packages are ignored.
 */
function goComponentNames(tree, file, resolveGoImport) {
  const names = new Set();
  for (const node of typedNodes(tree)) {
    if (node.type !== 'ImportDeclaration') {
      continue;
    }
    const source = node.source?.value;
    const resolved = resolveGoImport(source, file);
    if (!resolved) {
      continue;
    }
    for (const specifier of node.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        ((specifier.imported.name === 'Go' && resolved.named) ||
          (specifier.imported.name === 'default' && resolved.default))
      ) {
        names.add(specifier.local.name);
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        if (resolved.named) {
          names.add(`${specifier.local.name}.Go`);
        }
        if (resolved.default) {
          names.add(`${specifier.local.name}.default`);
        }
      } else if (
        specifier.type === 'ImportDefaultSpecifier' &&
        resolved.default
      ) {
        names.add(specifier.local.name);
      }
    }
  }
  return names;
}

/**
 * Convert the two JSX name forms this checker can validate into one string:
 * `Go` and `Namespace.Go` (including a namespace default export).
 */
function jsxName(node) {
  if (node?.type === 'JSXIdentifier') {
    return node.name;
  }
  if (
    node?.type === 'JSXMemberExpression' &&
    node.object.type === 'JSXIdentifier' &&
    node.property.type === 'JSXIdentifier'
  ) {
    return `${node.object.name}.${node.property.name}`;
  }
  return undefined;
}

// ESTree scope tracking

/**
 * Collect every identifier introduced by a destructuring or assignment
 * pattern. This feeds the scope model used to distinguish imported Go
 * components from expression-local bindings with the same name.
 */
function addPatternBindings(pattern, bindings) {
  if (!pattern) {
    return;
  }
  if (pattern.type === 'Identifier') {
    bindings.add(pattern.name);
  } else if (pattern.type === 'RestElement') {
    addPatternBindings(pattern.argument, bindings);
  } else if (pattern.type === 'AssignmentPattern') {
    addPatternBindings(pattern.left, bindings);
  } else if (pattern.type === 'ArrayPattern') {
    pattern.elements.forEach((element) =>
      addPatternBindings(element, bindings),
    );
  } else if (pattern.type === 'ObjectPattern') {
    pattern.properties.forEach((property) => {
      addPatternBindings(
        property.type === 'RestElement' ? property.argument : property.value,
        bindings,
      );
    });
  }
}

/**
 * Add bindings declared by one `var`, `let`, or `const` declaration.
 */
function addDeclarationBindings(declaration, bindings) {
  if (declaration?.type !== 'VariableDeclaration') {
    return;
  }
  declaration.declarations.forEach(({ id }) =>
    addPatternBindings(id, bindings),
  );
}

/**
 * Collect block-local lexical declarations and declaration names.
 */
function addBlockBindings(statements, bindings) {
  for (const statement of statements) {
    if (statement.type === 'VariableDeclaration' && statement.kind !== 'var') {
      addDeclarationBindings(statement, bindings);
    } else if (
      (statement.type === 'FunctionDeclaration' ||
        statement.type === 'ClassDeclaration') &&
      statement.id
    ) {
      bindings.add(statement.id.name);
    }
  }
}

/**
 * Collect function-scoped `var` bindings without entering nested functions or
 * static blocks. Hoisting does not cross either scope boundary.
 */
function addFunctionVarBindings(node, bindings) {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'StaticBlock'
  ) {
    return;
  }
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    addDeclarationBindings(node, bindings);
  }
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string'
      ) {
        addFunctionVarBindings(child, bindings);
      }
    }
  }
}

/**
 * Preserve the parent set when a scope contributes no bindings, avoiding
 * needless allocations during the recursive AST walk.
 */
function withBindings(parentBindings, additions) {
  if (additions.size === 0) {
    return parentBindings;
  }
  return new Set([...parentBindings, ...additions]);
}

/**
 * Yield ESTree JSX elements that still refer to imported Go bindings.
 *
 * Bindings are precollected for each scope so temporal dead zones and `var`
 * hoisting cannot make component identity depend on traversal order.
 */
function* estreeGoComponentNodes(node, names, parentBindings = new Set()) {
  const additions = new Set();
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    node.params.forEach((parameter) =>
      addPatternBindings(parameter, additions),
    );
    if (node.type === 'FunctionExpression' && node.id) {
      additions.add(node.id.name);
    }
    addFunctionVarBindings(node.body, additions);
  } else if (node.type === 'ClassExpression' && node.id) {
    additions.add(node.id.name);
  } else if (node.type === 'StaticBlock') {
    addBlockBindings(node.body, additions);
    node.body.forEach((statement) =>
      addFunctionVarBindings(statement, additions),
    );
  } else if (node.type === 'BlockStatement') {
    addBlockBindings(node.body, additions);
  } else if (node.type === 'CatchClause') {
    addPatternBindings(node.param, additions);
  } else if (node.type === 'ForStatement') {
    addDeclarationBindings(node.init, additions);
  } else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
    addDeclarationBindings(node.left, additions);
  } else if (node.type === 'SwitchStatement') {
    node.cases.forEach(({ consequent }) =>
      addBlockBindings(consequent, additions),
    );
  }
  const bindings = withBindings(parentBindings, additions);

  if (node.type === 'JSXOpeningElement') {
    const name = jsxName(node.name);
    const rootName = name?.split('.')[0];
    if (names.has(name) && !bindings.has(rootName)) {
      yield node;
    }
  }

  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string'
      ) {
        yield* estreeGoComponentNodes(child, names, bindings);
      }
    }
  }
}

/**
 * Normalize Go nodes from direct MDX JSX and JSX nested inside expressions.
 * The caller can therefore validate both representations with one prop path.
 */
function* goComponentNodes(node, names) {
  if (
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    names.has(node.name)
  ) {
    yield {
      name: node.name,
      attributes: node.attributes,
      line: node.position?.start.line,
    };
  }

  if (node.data?.estree) {
    for (const openingElement of estreeGoComponentNodes(
      node.data.estree,
      names,
    )) {
      const name = jsxName(openingElement.name);
      yield {
        name,
        attributes: openingElement.attributes,
        line: openingElement.loc?.start.line,
      };
    }
  }

  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === 'object' &&
        typeof child.type === 'string'
      ) {
        yield* goComponentNodes(child, names);
      }
    }
  }
}

// Prop normalization and policy

/**
 * Convert MDX and ESTree JSX attributes into one representation. Only quoted
 * string literals retain a value; expressions and boolean props remain
 * undefined so literal-only policies reject them consistently.
 */
function normalizeAttribute(attribute) {
  if (
    attribute.type === 'mdxJsxExpressionAttribute' ||
    attribute.type === 'JSXSpreadAttribute'
  ) {
    return {
      name: 'spread',
      line:
        attribute.position?.start.line ??
        attribute.data?.estree?.loc?.start.line ??
        attribute.loc?.start.line,
    };
  }

  if (attribute.type === 'mdxJsxAttribute') {
    return {
      name: attribute.name,
      value: attribute.value,
      line: attribute.position?.start.line,
    };
  }

  if (attribute.type === 'JSXAttribute') {
    return {
      name: attribute.name?.name,
      value:
        attribute.value?.type === 'Literal' &&
        typeof attribute.value.value === 'string'
          ? attribute.value.value
          : undefined,
      line: attribute.loc?.start.line,
    };
  }

  return undefined;
}

/**
 * Validate the full parsed URL origin rather than matching a string prefix.
 * This rejects credentials, alternate ports, non-HTTPS schemes, and whitespace
 * tricks even when the hostname resembles an approved origin.
 */
function imageViolation(value) {
  if (typeof value !== 'string') {
    return 'img must be a string literal';
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return 'img must be an absolute HTTPS URL';
  }

  if (
    !approvedImageOrigins.has(url.origin) ||
    url.username ||
    url.password ||
    value !== value.trim()
  ) {
    return `img must use an approved origin: ${approvedImageOriginsText}`;
  }

  return undefined;
}

// Generated example metadata

/**
 * Create a cached resolver for generated `example-metadata.json` files.
 *
 * Example IDs are treated as untrusted document input: resolved paths must stay
 * under the supplied root. Metadata must expose unique, non-empty entry names
 * before a document can select one.
 */
export function createExampleMetadataResolver(metadataRoot) {
  const root = path.resolve(metadataRoot);
  let rootStats;
  try {
    rootStats = statSync(root);
  } catch (error) {
    throw new Error(`could not read metadata root ${root}: ${error.message}`);
  }
  if (!rootStats.isDirectory()) {
    throw new Error(`metadata root is not a directory: ${root}`);
  }

  const cache = new Map();
  return function resolveExampleMetadata(example) {
    if (cache.has(example)) {
      return cache.get(example);
    }

    const metadataFile = path.resolve(root, example, 'example-metadata.json');
    const relativeMetadataFile = path.relative(root, metadataFile);
    if (
      relativeMetadataFile === '..' ||
      relativeMetadataFile.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeMetadataFile)
    ) {
      throw new Error(`example "${example}" resolves outside metadata root`);
    }

    let metadata;
    try {
      metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
    } catch (error) {
      throw new Error(
        `could not read metadata for example "${example}" at ${metadataFile}: ${error.message}`,
      );
    }

    if (!metadata || !Array.isArray(metadata.templateFiles)) {
      throw new Error(
        `metadata for example "${example}" must contain a templateFiles array`,
      );
    }

    const templateNames = metadata.templateFiles.map((template, index) => {
      if (
        !template ||
        typeof template.name !== 'string' ||
        template.name.length === 0
      ) {
        throw new Error(
          `metadata for example "${example}" has an invalid templateFiles[${index}].name`,
        );
      }
      return template.name;
    });
    const duplicateName = templateNames.find(
      (name, index) => templateNames.indexOf(name) !== index,
    );
    if (duplicateName) {
      throw new Error(
        `metadata for example "${example}" has duplicate template name "${duplicateName}"`,
      );
    }

    cache.set(example, templateNames);
    return templateNames;
  };
}

/**
 * Always enforce literal entry names. When a metadata resolver is supplied,
 * also require a literal example ID and exactly one matching template entry.
 * This keeps editor scans generation-independent while CI can opt into the
 * stronger post-prepare contract.
 */
function validateDefaultEntryName(component, attributes, resolver) {
  const violations = [];
  for (const attribute of attributes) {
    if (attribute.name !== 'defaultEntryName') {
      continue;
    }

    const line = attribute.line ?? component.line ?? 1;
    if (typeof attribute.value !== 'string') {
      violations.push({
        line,
        component: component.name,
        prop: attribute.name,
        reason: 'must be a string literal',
      });
      continue;
    }
    if (!resolver) {
      continue;
    }

    const example = attributes.findLast(({ name }) => name === 'example');
    if (!example || typeof example.value !== 'string') {
      violations.push({
        line,
        component: component.name,
        prop: attribute.name,
        reason: 'example must be a string literal when defaultEntryName is set',
      });
      continue;
    }

    let templateNames;
    try {
      templateNames = resolver(example.value);
    } catch (error) {
      violations.push({
        line,
        component: component.name,
        prop: attribute.name,
        reason: error.message,
      });
      continue;
    }

    const matches = templateNames.filter((name) => name === attribute.value);
    if (matches.length !== 1) {
      const availableNames =
        templateNames.length > 0 ? templateNames.join(', ') : '(none)';
      violations.push({
        line,
        component: component.name,
        prop: attribute.name,
        reason:
          matches.length > 1
            ? `"${attribute.value}" is ambiguous in example "${example.value}" metadata (${matches.length} matches)`
            : `"${attribute.value}" does not match example "${example.value}" metadata; available names: ${availableNames}`,
      });
    }
  }
  return violations;
}

/**
 * Enforce authored Go contracts on rendered components.
 *
 * The parser ignores examples and comments according to Markdown/MDX semantics.
 * Component discovery follows supported imports, then all attributes pass
 * through the same normalization before selector and preview checks.
 */
export function findGoComponentViolations(
  file,
  content,
  { resolveExampleMetadata, resolveGoImport = resolveDefaultGoImport } = {},
) {
  const normalizedFile = toPosix(file);
  const tree = parseDocumentation(normalizedFile, content);
  const violations = [];
  const names = goComponentNames(tree, normalizedFile, resolveGoImport);

  for (const component of goComponentNodes(tree, names)) {
    const attributes = (component.attributes ?? [])
      .map(normalizeAttribute)
      .filter(Boolean);
    violations.push(
      ...validateDefaultEntryName(
        component,
        attributes,
        resolveExampleMetadata,
      ).map((violation) => ({ file: normalizedFile, ...violation })),
    );

    for (const normalizedAttribute of attributes) {
      const line = normalizedAttribute.line ?? component.line ?? 1;
      if (normalizedAttribute.name === 'spread') {
        violations.push({
          file: normalizedFile,
          line,
          component: component.name,
          prop: 'spread',
          reason: 'spread attributes are not allowed',
        });
        continue;
      }

      if (normalizedAttribute.name === 'defaultEntryFile') {
        violations.push({
          file: normalizedFile,
          line,
          component: component.name,
          prop: normalizedAttribute.name,
          reason: 'use defaultEntryName instead',
        });
      }

      if (normalizedAttribute.name === 'img') {
        const reason = imageViolation(normalizedAttribute.value);
        if (reason) {
          violations.push({
            file: normalizedFile,
            line,
            component: component.name,
            prop: normalizedAttribute.name,
            reason,
          });
        }
      }
    }
  }

  return violations.sort((a, b) => a.line - b.line);
}

// CLI file selection and reporting

/**
 * Limit scans to Markdown sources copied into downstream documentation.
 */
function isDocumentationFile(file) {
  return (
    (file.startsWith('docs/') || file.startsWith('sharedDocs/')) &&
    docExtensions.has(path.posix.extname(file))
  );
}

function walkDocumentationFiles(root) {
  const files = [];

  function walk(directory, relativeDirectory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativeFile = path.posix.join(relativeDirectory, entry.name);
      const absoluteFile = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absoluteFile, relativeFile);
      } else if (isDocumentationFile(relativeFile)) {
        files.push(relativeFile);
      }
    }
  }

  walk(root, '');
  return files;
}

/**
 * Scan tracked and untracked documents by default so newly authored files are
 * covered before commit. Explicit paths support lint-staged and skip files
 * outside the scan root. The optional root is used by tests to scan temporary
 * fixture trees without placing untracked files in the checkout.
 */
function filesToCheck(args, scanRoot = repoRoot) {
  if (args.length === 0) {
    if (scanRoot !== repoRoot) {
      return walkDocumentationFiles(scanRoot);
    }
    return execFileSync(
      'git',
      [
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-standard',
        'docs',
        'sharedDocs',
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    )
      .split('\0')
      .filter(Boolean);
  }

  return args
    .map((file) =>
      toPosix(
        path.relative(
          scanRoot,
          path.isAbsolute(file) ? file : path.resolve(process.cwd(), file),
        ),
      ),
    )
    .filter((file) => !file.startsWith('../'));
}

/**
 * Keep metadata validation opt-in. `--scan-root` is used by tests to isolate
 * temporary fixtures, while `--` preserves support for unusual document
 * filenames that begin with a dash.
 */
function parseArguments(args) {
  const files = [];
  let metadataRoot;
  let scanRoot;
  let positionalOnly = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (positionalOnly) {
      files.push(argument);
    } else if (argument === '--') {
      positionalOnly = true;
    } else if (argument === '--metadata-root') {
      metadataRoot = args[index + 1];
      if (!metadataRoot) {
        throw new Error('--metadata-root requires a directory');
      }
      index += 1;
    } else if (argument.startsWith('--metadata-root=')) {
      metadataRoot = argument.slice('--metadata-root='.length);
      if (!metadataRoot) {
        throw new Error('--metadata-root requires a directory');
      }
    } else if (argument === '--scan-root') {
      scanRoot = args[index + 1];
      if (!scanRoot) {
        throw new Error('--scan-root requires a directory');
      }
      index += 1;
    } else if (argument.startsWith('--scan-root=')) {
      scanRoot = argument.slice('--scan-root='.length);
      if (!scanRoot) {
        throw new Error('--scan-root requires a directory');
      }
    } else if (argument.startsWith('--')) {
      throw new Error(`unknown option: ${argument}`);
    } else {
      files.push(argument);
    }
  }

  return { files, metadataRoot, scanRoot };
}

/**
 * Aggregate parse, read, and policy failures across the scan. Missing explicit
 * files may be staged deletions and are skipped.
 */
function run() {
  const violations = [];
  let files;
  let resolveExampleMetadata;
  let scanRoot = repoRoot;
  try {
    const options = parseArguments(process.argv.slice(2));
    files = options.files;
    scanRoot = options.scanRoot
      ? path.resolve(process.cwd(), options.scanRoot)
      : repoRoot;
    if (!statSync(scanRoot).isDirectory()) {
      throw new Error(`scan root is not a directory: ${scanRoot}`);
    }
    resolveExampleMetadata = options.metadataRoot
      ? createExampleMetadataResolver(options.metadataRoot)
      : undefined;
  } catch (error) {
    console.error(`Go component checker: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  for (const file of filesToCheck(files, scanRoot)) {
    if (!isDocumentationFile(file)) {
      continue;
    }

    let content;
    try {
      content = readFileSync(path.join(scanRoot, file), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      console.error(`${file}: could not read document: ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    try {
      violations.push(
        ...findGoComponentViolations(file, content, {
          resolveExampleMetadata,
        }),
      );
    } catch (error) {
      const line = error.line ?? error.place?.start?.line ?? 1;
      console.error(
        `${file}:${line}: could not parse document: ${error.message}`,
      );
      process.exitCode = 1;
    }
  }

  if (violations.length === 0) {
    return;
  }

  console.error('Go components must use portable entries and CDN images:');
  for (const violation of violations) {
    console.error(
      `  - ${violation.file}:${violation.line}: <${violation.component}> ${violation.prop}: ${violation.reason}`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  run();
}
