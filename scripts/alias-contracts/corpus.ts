/**
 * Shared executable-import corpus for Gates 2 and 3. Discovery never evaluates
 * source documents; raw spelling and producer ownership survive assembly.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parseDocumentation } from '../ci/documentation-parser.mjs';
import type { ActiveContracts } from './check-registry.js';
import type { OwnerId, SourceArea } from './types.js';

export interface ImportBinding {
  name: string;
  typeOnly: boolean;
}
export interface ImportRecord {
  importer: string;
  sourceArea: string;
  owner: OwnerId;
  specifier: string;
  kind: 'import' | 'require' | 'export' | 'export-star' | 'dynamic';
  line: number;
  bindings: ImportBinding[];
}
type SyntaxRecord = Omit<ImportRecord, 'importer' | 'sourceArea' | 'owner'>;
const sourcePattern = /\.(?:[cm]?[jt]sx?|mdx?)$/;
export const posix = (file: string): string => file.split(path.sep).join('/');
export const canonical = (file: string): string =>
  existsSync(file) ? realpathSync(file) : path.resolve(file);
const contains = (root: string, file: string): boolean =>
  file === root || file.startsWith(`${root}${path.sep}`);
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

/** Pure classification from the manifest used by the OSS preparation step. */
export function producerAreas(data: unknown): SourceArea[] {
  if (!data || !Array.isArray((data as any).sections))
    throw new Error('Invalid lynx-stack manifest sections');
  return (data as any).sections.flatMap((section: any) => {
    const normalized = (value: unknown): value is string =>
      typeof value === 'string' &&
      !path.isAbsolute(value) &&
      !value.includes('\\') &&
      value.split('/').every((part) => part && part !== '.' && part !== '..');
    if (
      !normalized(section.route) ||
      !section.content ||
      typeof section.content !== 'object'
    ) {
      throw new Error('Invalid lynx-stack manifest destination');
    }
    return Object.entries(section.content).map(([locale, origin]) => {
      if (!normalized(locale) || locale.includes('/') || !normalized(origin))
        throw new Error('Invalid lynx-stack manifest locale/source');
      return {
        id: `lynx-stack:${locale}:${section.route}`,
        root: `docs/${locale}/${section.route}`,
        owner: 'lynx-stack' as const,
        role: 'generated' as const,
        origins: [{ repository: 'lynx-family/lynx-stack', root: origin }],
      };
    });
  });
}

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

export function parseImports(file: string, content: string): SyntaxRecord[] {
  if (!sourcePattern.test(file)) return [];
  if (/\.mdx?$/.test(file)) return parseDocument(file, content);
  return parseScript(file, content);
}

export function matchingAlias(
  specifier: string,
  aliases: ActiveContracts['aliases'],
) {
  return aliases
    .filter(
      (alias) =>
        specifier === alias.specifier ||
        specifier.startsWith(`${alias.specifier}/`),
    )
    .sort((left, right) => right.specifier.length - left.specifier.length)[0];
}

/**
 * Scan JS/TS/MDX in site source/theme, declared roots, and tracked site modules.
 * The OSS caller supplies its producer manifest to include assembled docs.
 * Consumer layouts do not inspect installed package internals.
 * Return all imports in this scope so Gate 3 can reuse the same records.
 */
export function discoverCorpus(
  cwd: string,
  contracts: ActiveContracts,
  producerManifest?: unknown,
): ImportRecord[] {
  const producer =
    producerManifest === undefined ? [] : producerAreas(producerManifest);
  const areas = [...contracts.sourceAreas, ...producer];
  const tracked = execFileSync('git', ['ls-files', '-z'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  }).split('\0');
  const files = new Set(
    tracked.filter(
      (file) =>
        sourcePattern.test(file) &&
        existsSync(path.resolve(cwd, file)) &&
        (!file.includes('/') ||
          /^(src|theme)\//.test(file) ||
          (producerManifest !== undefined &&
            /^(docs|sharedDocs)\//.test(file))) &&
        !file.startsWith('docs/public/'),
    ),
  );
  const seenDirectories = new Set<string>();
  const walk = (file: string): void => {
    const absolute = path.resolve(cwd, file);
    if (!existsSync(absolute)) return;
    if (statSync(absolute).isDirectory()) {
      const real = canonical(absolute);
      if (seenDirectories.has(real)) return;
      seenDirectories.add(real);
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
    ...(producerManifest === undefined ? [] : ['docs', 'sharedDocs']),
    ...areas
      .filter(
        (area) =>
          area.owner !== 'rspress' && !area.root.startsWith('docs/public/'),
      )
      .map((area) => area.root),
  ])
    walk(root);
  const records: ImportRecord[] = [];
  const seen = new Map<string, OwnerId | undefined>();
  for (const file of [...files].sort()) {
    // Producer areas override locale fallback, never an explicit other owner.
    const area = classifySource(file, cwd, areas);
    const fallback =
      producerManifest !== undefined && /^docs\/[^/]+\/.*\.mdx?$/.test(file)
        ? { id: 'website-locale-docs', owner: 'lynx-website' as const }
        : undefined;
    const source = area ?? fallback;
    const real = canonical(path.resolve(cwd, file));
    if (seen.has(real)) {
      if (seen.get(real) !== source?.owner)
        throw new Error(`${file}: ambiguous mounted importer ownership`);
      continue;
    }
    seen.set(real, source?.owner);
    let imports: SyntaxRecord[];
    try {
      imports = parseImports(
        file,
        readFileSync(path.resolve(cwd, file), 'utf8'),
      );
    } catch (error) {
      throw new Error(`${file}: ${(error as Error).message}`);
    }
    for (const record of imports) {
      if (!source) {
        if (matchingAlias(record.specifier, contracts.aliases))
          throw new Error(`${file}: alias importer has no source area`);
        continue;
      }
      records.push({
        ...record,
        importer: file,
        sourceArea: source.id,
        owner: source.owner,
      });
    }
  }
  return records.sort(
    (a, b) =>
      compare(a.importer, b.importer) ||
      a.line - b.line ||
      compare(a.specifier, b.specifier) ||
      compare(a.kind, b.kind),
  );
}
