/**
 * Shared executable-import corpus for Gates 2 and 3. Discovery never evaluates
 * source documents; raw spelling and producer ownership survive assembly.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parseDocumentation } from '../ci/documentation-parser.mjs';
import type { ActiveContracts } from './check-registry.js';
import {
  preparedDocumentation,
  type PreparedFile,
} from './documentation-corpus.js';
import type {
  AliasContract,
  OwnerId,
  SourceArea,
  SourceOrigin,
} from './types.js';

export interface ImportBinding {
  name: string;
  typeOnly: boolean;
}

/**
 * One syntax-level module request with enough source and binding context for
 * resolver probes and later import-policy checks.
 */
export interface ImportRecord {
  importer: string;
  sourceArea: string;
  owner: OwnerId;
  specifier: string;
  kind:
    | 'import'
    | 'require'
    | 'export'
    | 'export-star'
    | 'dynamic'
    | 'configuration';
  line: number;
  bindings: ImportBinding[];
  /** Original static import/re-export attributes, including `with`/`assert`. */
  attributes?: string;
  boundary?: SourceArea['boundary'];
  /** A documentation path remains constrained after importer symlink resolution. */
  documentation?: true;
  role?: SourceArea['role'];
  /** JSON field path for a registered generator setting. */
  field?: readonly string[];
  /** Optional canonical origins declared for the final importer. */
  origins?: readonly SourceOrigin[];
}
type SyntaxRecord = Omit<
  ImportRecord,
  | 'importer'
  | 'sourceArea'
  | 'owner'
  | 'boundary'
  | 'documentation'
  | 'role'
  | 'field'
  | 'origins'
>;
const sourcePattern = /\.(?:[cm]?[jt]sx?|mdx?)$/;
export const posix = (file: string): string => file.split(path.sep).join('/');
/** Classify the resource path; resolvers and diagnostics retain the raw request. */
export const resourcePath = (request: string): string =>
  request.split(/[?#]/, 1)[0]!;
/** Remove only the originating request's suffix from a runtime resolver result. */
export const resolvedResource = (request: string, resolved: string): string => {
  const suffix = request.slice(resourcePath(request).length);
  return suffix && resolved.endsWith(suffix)
    ? resolved.slice(0, -suffix.length)
    : resolved;
};
/** Resolve existing parents too: an absent leaf can still cross a symlink. */
export const canonical = (file: string): string => {
  let absolute = path.resolve(file);
  let parent = absolute;
  const links = new Set<string>();
  while (!existsSync(parent)) {
    let metadata;
    try {
      metadata = lstatSync(parent, { throwIfNoEntry: false });
    } catch (error) {
      if (
        !['ENOENT', 'ENOTDIR'].includes(
          (error as NodeJS.ErrnoException).code ?? '',
        )
      )
        throw error;
    }
    // Dangling directory links are common before prepare. Resolve their link
    // text too; realpath cannot follow a destination that is still absent.
    if (metadata?.isSymbolicLink()) {
      if (links.has(parent))
        throw new Error(`Cyclic source symlink: ${parent}`);
      links.add(parent);
      absolute = path.resolve(
        path.dirname(parent),
        readlinkSync(parent),
        path.relative(parent, absolute),
      );
      parent = absolute;
      continue;
    }
    const next = path.dirname(parent);
    if (next === parent) return absolute;
    parent = next;
  }
  return path.resolve(realpathSync(parent), path.relative(parent, absolute));
};
const contains = (root: string, file: string): boolean =>
  file === root || file.startsWith(`${root}${path.sep}`);
const overlaps = (left: string, right: string): boolean =>
  contains(left, right) || contains(right, left);
const runtimeRoots = (areas: readonly SourceArea[]): string[] => [
  'src',
  'theme',
  ...areas
    .filter((area) => area.boundary === 'runtime')
    .map((area) => area.root),
];
/** Documentation inputs declare portable boundaries; prepared inventory owns discovery. */
export const documentationRoots = (contracts: ActiveContracts): string[] => [
  ...new Set([
    ...(contracts.documentationScope?.roots ?? []),
    ...(contracts.documentationCorpus?.roots ?? []),
  ]),
];
const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

/** Match canonical roots; conflicting owners fail closed. */
export function classifySource(
  file: string,
  cwd: string,
  areas: readonly SourceArea[],
): SourceArea | undefined {
  const absolute = path.resolve(cwd, file);
  const real = canonical(absolute);
  const matches = areas
    .map((area) => ({ area, root: canonical(path.resolve(cwd, area.root)) }))
    .filter(({ root }) => contains(root, real));
  if (new Set(matches.map(({ area }) => area.owner)).size > 1) {
    throw new Error(
      `${posix(file)}: ambiguous source ownership (${matches
        .map(({ area }) => area.id)
        .sort()
        .join(', ')})`,
    );
  }
  // Most specific physical root takes precedence, with stable tie breaking.
  return matches.sort(
    (a, b) => b.root.length - a.root.length || compare(a.area.id, b.area.id),
  )[0]?.area;
}

/** Preserve the pre-resolution boundary of standard documentation trees. */
export function lexicalBoundary(
  file: string,
  cwd: string,
): SourceArea['boundary'] {
  const relative = posix(path.relative(cwd, path.resolve(cwd, file)));
  if (
    /^(docs|sharedDocs)(?:\/|$)/.test(relative) &&
    relative !== 'docs/public' &&
    !relative.startsWith('docs/public/')
  )
    return 'documentation';
  if (/^(src|theme)(?:\/|$)/.test(relative)) return 'runtime';
  return undefined;
}

/** Standard trees plus explicit metadata for relocated consumer roots. */
export function portableBoundary(
  file: string,
  cwd: string,
  areas: readonly SourceArea[],
  documentationRoots: readonly string[] = [],
): SourceArea['boundary'] {
  const area = classifySource(file, cwd, areas);
  const real = canonical(path.resolve(cwd, file));
  // Physical paths must be classified relative to the same physical cwd.
  const boundary = lexicalBoundary(real, canonical(cwd));
  const runtimes = runtimeRoots(areas).map((root) =>
    canonical(path.resolve(cwd, root)),
  );
  if (area?.boundary === 'documentation') {
    const root = canonical(path.resolve(cwd, area.root));
    if (runtimes.some((runtime) => overlaps(runtime, root)))
      throw new Error(`${posix(file)}: documentation owner overlaps runtime`);
  }
  let prepared = false;
  for (const root of documentationRoots) {
    const physical = canonical(path.resolve(cwd, root));
    // Root overlap is forbidden even when no source area owns the subtree.
    if (runtimes.some((runtime) => overlaps(runtime, physical)))
      throw new Error(
        `${posix(file)}: prepared documentation overlaps runtime`,
      );
    prepared ||= contains(physical, real);
  }
  return prepared ? 'documentation' : (area?.boundary ?? boundary);
}

/** Only registered JSON values enter the corpus; no JSON-wide string search. */
export function configurationCorpus(
  cwd: string,
  areas: readonly SourceArea[],
): ImportRecord[] {
  const records: ImportRecord[] = [];
  const documents = new Map<string, any>();
  const fields = new Set<string>();
  for (const area of areas) {
    for (const field of area.moduleSpecifierFields ?? []) {
      const absolute = path.resolve(cwd, field.file);
      if (!existsSync(absolute)) continue;
      const key = JSON.stringify([canonical(absolute), field.path]);
      if (fields.has(key))
        throw new Error(`${field.file}: duplicate registered field`);
      fields.add(key);
      if (!documents.has(absolute))
        documents.set(absolute, JSON.parse(readFileSync(absolute, 'utf8')));
      let value: any = documents.get(absolute);
      for (const segment of field.path)
        value =
          value && Object.hasOwn(value, segment) ? value[segment] : undefined;
      if (typeof value !== 'string' || !value.trim())
        throw new Error(
          `${field.file}: ${field.path.join('.')} must be a module specifier`,
        );
      records.push({
        importer: field.file,
        sourceArea: area.id,
        owner: area.owner,
        boundary: area.boundary,
        // The setting itself is authoritative, even for generated destinations.
        role: 'authoritative',
        specifier: value,
        field: field.path,
        kind: 'configuration',
        line: 1,
        bindings: [],
      });
    }
  }
  return records;
}

/**
 * Parse executable JS/TS module requests without evaluating the source.
 * Static import/re-export attributes and erased bindings remain observable.
 */
export function parseScript(file: string, content: string): SyntaxRecord[] {
  const tree = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const diagnostics = (
    tree as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }
  ).parseDiagnostics;
  if (diagnostics.length)
    throw new Error(
      `${file}: ${ts.flattenDiagnosticMessageText(diagnostics[0]!.messageText, '\n')}`,
    );
  const records: SyntaxRecord[] = [];
  const add = (
    node: ts.Node,
    specifier: ts.StringLiteralLike,
    kind: SyntaxRecord['kind'],
    bindings: ImportBinding[],
  ) => {
    records.push({
      specifier: specifier.text,
      kind,
      bindings,
      line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1,
      ...((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.attributes
        ? { attributes: node.attributes.getText(tree) }
        : {}),
    });
  };
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      const clause = node.importClause;
      const bindings: ImportBinding[] = [];
      if (clause?.name)
        bindings.push({ name: 'default', typeOnly: clause.isTypeOnly });
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings))
          bindings.push({ name: '*', typeOnly: clause.isTypeOnly });
        else
          for (const entry of clause.namedBindings.elements)
            bindings.push({
              name: (entry.propertyName ?? entry.name).text,
              typeOnly: clause.isTypeOnly || entry.isTypeOnly,
            });
      }
      if (clause && !bindings.length)
        bindings.push({ name: '*', typeOnly: clause.isTypeOnly });
      add(node, node.moduleSpecifier, 'import', bindings);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      const bindings =
        node.exportClause && ts.isNamedExports(node.exportClause)
          ? node.exportClause.elements.map((entry) => ({
              name: (entry.propertyName ?? entry.name).text,
              typeOnly: node.isTypeOnly || entry.isTypeOnly,
            }))
          : [{ name: '*', typeOnly: node.isTypeOnly }];
      add(
        node,
        node.moduleSpecifier,
        node.exportClause ? 'export' : 'export-star',
        bindings,
      );
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      add(node, node.moduleReference.expression, 'require', [
        { name: '*', typeOnly: node.isTypeOnly },
      ]);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      let qualifier = node.qualifier;
      while (qualifier && ts.isQualifiedName(qualifier))
        qualifier = qualifier.left;
      add(node, node.argument.literal, 'import', [
        { name: qualifier?.text ?? '*', typeOnly: true },
      ]);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument))
        add(
          node,
          argument,
          node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? 'dynamic'
            : 'require',
          [{ name: '*', typeOnly: false }],
        );
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return records;
}

function parseDocument(file: string, content: string): SyntaxRecord[] {
  const tree = parseDocumentation(file, content);
  const records: SyntaxRecord[] = [];
  // ESTree covers module requests inside MDX expressions/JSX props.
  const visitEstree = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    const requireCall =
      node.type === 'CallExpression' &&
      node.callee?.type === 'Identifier' &&
      node.callee.name === 'require';
    const source = requireCall ? node.arguments[0] : node.source;
    const literal =
      typeof source?.value === 'string'
        ? source.value
        : source?.type === 'TemplateLiteral' && source.expressions.length === 0
          ? source.quasis[0]?.value.cooked
          : undefined;
    if (
      (requireCall ||
        [
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportAllDeclaration',
          'ImportExpression',
        ].includes(node.type)) &&
      typeof literal === 'string'
    ) {
      const bindings =
        requireCall ||
        node.type === 'ImportExpression' ||
        node.type === 'ExportAllDeclaration'
          ? [{ name: '*', typeOnly: false }]
          : (node.specifiers ?? []).map((entry: any) => ({
              name:
                entry.type === 'ImportDefaultSpecifier'
                  ? 'default'
                  : entry.type === 'ImportNamespaceSpecifier'
                    ? '*'
                    : (entry.imported?.name ??
                      entry.imported?.value ??
                      entry.local?.name ??
                      entry.local?.value),
              typeOnly: false,
            }));
      records.push({
        specifier: literal,
        kind: requireCall
          ? 'require'
          : node.type === 'ImportExpression'
            ? 'dynamic'
            : node.type === 'ImportDeclaration'
              ? 'import'
              : node.type === 'ExportAllDeclaration' && !node.exported
                ? 'export-star'
                : 'export',
        line: node.loc?.start.line ?? 1,
        bindings,
      });
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'position') continue;
      if (Array.isArray(value)) value.forEach(visitEstree);
      else if (value && typeof value === 'object') visitEstree(value);
    }
  };
  const visit = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (node.data?.estree) visitEstree(node.data.estree);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'data' || key === 'position') continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(tree);
  return records;
}

/** Parse executable module requests from a supported script or MDX document. */
export function parseImports(file: string, content: string): SyntaxRecord[] {
  if (!sourcePattern.test(file)) return [];
  if (/\.mdx?$/.test(file)) return parseDocument(file, content);
  return parseScript(file, content);
}

/** Return the most specific registered alias covering a resource path. */
export function matchingAlias(
  specifier: string,
  aliases: ActiveContracts['aliases'],
) {
  const request = resourcePath(specifier);
  return aliases
    .filter(
      (alias) =>
        request === alias.specifier ||
        request.startsWith(`${alias.specifier}/`),
    )
    .sort((left, right) => right.specifier.length - left.specifier.length)[0];
}

/** Documentation extensions share public consumer policy, never private access. */
export function aliasAllowsImporter(
  alias: AliasContract,
  owner: OwnerId,
): boolean {
  const importer =
    alias.visibility === 'public' && owner.startsWith('consumer:')
      ? 'consumer'
      : owner;
  return alias.allowedImporters.some((allowed) => allowed === importer);
}

/**
 * Scan JS/TS/MDX in site source/theme, declared roots, and tracked site modules.
 * Site adapters supply source areas, scope and final documentation ownership.
 * Discovery does not inspect installed package internals. Canonical paths
 * deduplicate mounts and make conflicting ownership fail closed.
 */
export function discoverCorpus(
  cwd: string,
  contracts: ActiveContracts,
): ImportRecord[] {
  const scope = contracts.documentationScope;
  const areas = contracts.sourceAreas;
  const roots = documentationRoots(contracts);
  const inScope = (file: string): boolean =>
    !!scope?.roots.some((root) =>
      contains(path.resolve(cwd, root), path.resolve(cwd, file)),
    );
  const publicRoot = canonical(path.resolve(cwd, 'docs/public'));
  // A public mount cannot hide tracked or relocated runtime files.
  for (const root of runtimeRoots(areas)) {
    const real = canonical(path.resolve(cwd, root));
    if (overlaps(publicRoot, real))
      throw new Error(
        `docs/public: public resources overlap runtime root '${root}'`,
      );
  }
  for (const root of roots) {
    if (contains(publicRoot, canonical(path.resolve(cwd, root))))
      throw new Error(`${root}: public resources are not documentation roots`);
    if (
      !statSync(path.resolve(cwd, root), {
        throwIfNoEntry: false,
      })?.isDirectory()
    )
      throw new Error(`${root}: missing documentation root`);
    portableBoundary(root, cwd, areas, roots);
  }
  const tracked = execFileSync('git', ['ls-files', '-z'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  }).split('\0');
  const trackedFiles = new Set(tracked);
  // Prepared file ownership takes precedence over physical importer mappings.
  const sourceFor = (file: string) =>
    classifySource(file, cwd, areas) ??
    (scope?.trackedSource && trackedFiles.has(file) && inScope(file)
      ? {
          ...scope.trackedSource,
          role: 'authoritative' as const,
          origins: undefined,
        }
      : !file.includes('/')
        ? {
            id: 'site-modules',
            owner: 'consumer' as const,
            role: 'authoritative' as const,
            origins: undefined,
          }
        : undefined);
  for (const area of areas)
    if (area.boundary === 'documentation')
      portableBoundary(area.root, cwd, areas);
  const prepared = contracts.documentationCorpus
    ? preparedDocumentation(cwd, contracts.documentationCorpus, canonical)
    : new Map<string, PreparedFile>();
  // Prepared inventory is the only documentation importer entry point. Source
  // areas still classify resolver targets and discover runtime/configuration.
  const physicalDocumentationRoots = contracts.documentationCorpus
    ? [
        'docs',
        'sharedDocs',
        ...roots,
        ...areas
          .filter((area) => area.boundary === 'documentation')
          .map((area) => area.root),
      ].map((root) => canonical(path.resolve(cwd, root)))
    : [];
  const inPreparedDocumentation = (file: string, real: string): boolean =>
    !!contracts.documentationCorpus &&
    (lexicalBoundary(file, cwd) === 'documentation' ||
      physicalDocumentationRoots.some((root) => contains(root, real)));
  const files = new Set(
    tracked.filter(
      (file) =>
        sourcePattern.test(file) &&
        existsSync(path.resolve(cwd, file)) &&
        (!file.includes('/') || /^(src|theme)\//.test(file) || inScope(file)) &&
        !file.startsWith('docs/public/') &&
        !inPreparedDocumentation(file, canonical(path.resolve(cwd, file))),
    ),
  );
  const seenDirectories = new Set<string>();
  const walk = (file: string): void => {
    const absolute = path.resolve(cwd, file);
    const metadata = statSync(absolute, { throwIfNoEntry: false });
    if (!metadata) return;
    const real = canonical(absolute);
    if (contains(publicRoot, real) || inPreparedDocumentation(file, real))
      return;
    if (metadata.isDirectory()) {
      const key = JSON.stringify([
        real,
        inScope(file) || lexicalBoundary(file, cwd) === 'documentation',
      ]);
      if (seenDirectories.has(key)) return;
      seenDirectories.add(key);
      for (const entry of readdirSync(absolute).sort()) {
        if (
          entry === 'node_modules' ||
          entry.startsWith('.') ||
          (file === 'docs' && entry === 'public')
        )
          continue;
        walk(posix(path.join(file, entry)));
      }
    } else if (sourcePattern.test(file)) files.add(file);
  };
  for (const root of [
    'src',
    'theme',
    ...(contracts.documentationCorpus ? [] : (scope?.roots ?? [])),
    ...areas
      .filter(
        (area) =>
          area.owner !== 'rspress' &&
          !area.root.startsWith('docs/public/') &&
          (!contracts.documentationCorpus || area.boundary !== 'documentation'),
      )
      .map((area) => area.root),
  ])
    walk(root);
  const records: ImportRecord[] = [];
  for (const { file } of prepared.values()) files.add(file.file);
  const seen = new Map<
    string,
    { owner: OwnerId | undefined; records: ImportRecord[] }
  >();
  for (const file of [...files].sort()) {
    if (contains(publicRoot, canonical(path.resolve(cwd, file)))) continue;
    const real = canonical(path.resolve(cwd, file));
    const preparation = prepared.get(real);
    const source = preparation ? undefined : sourceFor(file);
    const owner = preparation?.file.owner ?? source?.owner;
    const documentation =
      !!preparation ||
      inScope(file) ||
      lexicalBoundary(file, cwd) === 'documentation';
    if (inScope(file) && !source && !preparation)
      throw new Error(
        `${file}: executable documentation has no source ownership`,
      );
    const previous = seen.get(real);
    if (previous) {
      if (previous.owner !== owner)
        throw new Error(`${file}: ambiguous mounted importer ownership`);
      // Prefer a documentation spelling for diagnostics and resolver context.
      // A mount visited earlier must not erase its documentation constraint.
      if (documentation)
        for (const record of previous.records)
          if (!record.documentation) {
            record.importer = file;
            record.documentation = true;
          }
      continue;
    }
    const discovered: ImportRecord[] = [];
    seen.set(real, { owner, records: discovered });
    let imports: SyntaxRecord[];
    try {
      imports = parseImports(
        file,
        preparation?.content ?? readFileSync(path.resolve(cwd, file), 'utf8'),
      );
    } catch (error) {
      throw new Error(`${file}: ${(error as Error).message}`);
    }
    const boundary =
      !preparation && source && imports.length
        ? portableBoundary(file, cwd, areas, roots)
        : undefined;
    const importOwners = new Map(
      preparation?.file.imports?.map((request) => [request.index, request]),
    );
    for (const [index, request] of importOwners) {
      const syntax = imports[index];
      if (!syntax)
        throw new Error(
          `${file}: import ownership index ${index} is outside the final syntax`,
        );
      if (syntax.specifier !== request.specifier)
        throw new Error(
          `${file}: import ownership index ${index} expects ${JSON.stringify(request.specifier)}, found ${JSON.stringify(syntax.specifier)}; regenerate import annotations and run prepare`,
        );
    }
    for (const [index, record] of imports.entries()) {
      if (preparation) {
        const ownership = importOwners.get(index) ?? preparation.file;
        discovered.push({
          ...record,
          importer: preparation.file.file,
          sourceArea: `prepared-document:${preparation.file.file}`,
          owner: ownership.owner,
          ...(ownership.origins ? { origins: ownership.origins } : {}),
          role: 'generated',
          boundary: 'documentation',
          documentation: true,
        });
        continue;
      }
      if (!source) {
        if (matchingAlias(record.specifier, contracts.aliases))
          throw new Error(`${file}: alias importer has no source area`);
        continue;
      }
      discovered.push({
        ...record,
        importer: file,
        sourceArea: source.id,
        owner: source.owner,
        role: source.role,
        ...(source.origins ? { origins: source.origins } : {}),
        boundary,
        ...(documentation ? { documentation: true as const } : {}),
      });
    }
    records.push(...discovered);
  }
  records.push(...configurationCorpus(cwd, areas));
  return records.sort(
    (a, b) =>
      compare(a.importer, b.importer) ||
      a.line - b.line ||
      compare(a.specifier, b.specifier) ||
      compare(a.kind, b.kind) ||
      compare(a.field?.join('.') ?? '', b.field?.join('.') ?? ''),
  );
}
