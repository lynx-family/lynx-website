/** Gate 3's relative-path policy, also used by the documentation-only entry. */
import path from 'node:path';
import {
  canonical,
  lexicalBoundary,
  parseImports,
  portableBoundary,
  posix,
  resourcePath,
  type ImportRecord,
} from './corpus.js';
import { ossSourceAreas } from './registry.js';
import type { SourceArea } from './types.js';

/**
 * Preserve lexical prohibitions even when a resolver redirects the request.
 * Resolved filesystem paths additionally cover mounts, symlinks and missing leaves.
 * Returning one target keeps environment probes from multiplying occurrences.
 */
export function relativeBoundaryTarget(
  cwd: string,
  areas: readonly SourceArea[],
  record: Pick<
    ImportRecord,
    'importer' | 'specifier' | 'boundary' | 'documentation'
  >,
  resolved: readonly string[] = [],
  documentationRoots: readonly string[] = [],
): string | undefined {
  if (
    (!record.boundary && !record.documentation) ||
    (!record.specifier.startsWith('./') && !record.specifier.startsWith('../'))
  )
    return undefined;
  const lexical = path.resolve(
    cwd,
    path.dirname(record.importer),
    resourcePath(record.specifier),
  );
  const crosses = (boundary: SourceArea['boundary']) =>
    boundary &&
    ((record.boundary && boundary !== record.boundary) ||
      (record.documentation && boundary !== 'documentation'));
  if (crosses(lexicalBoundary(lexical, cwd)))
    return posix(path.relative(cwd, lexical));
  for (const file of [lexical, ...resolved])
    if (crosses(portableBoundary(file, cwd, areas, documentationRoots)))
      return posix(path.relative(cwd, canonical(path.resolve(cwd, file))));
  return undefined;
}

/** Suggestions derive only from documented component roots, never symbols. */
function suggestedAlias(target: string, modifier: string): string | undefined {
  const aliasRoots = [
    ['src/components', '@lynx'],
    ['src/lynx-ui/components', '@lynx-ui'],
  ] as const;
  for (const [sourceRoot, alias] of aliasRoots) {
    if (target !== sourceRoot && !target.startsWith(`${sourceRoot}/`)) continue;
    const subpath = (
      target === sourceRoot ? '' : target.slice(sourceRoot.length + 1)
    )
      .replace(/\.(?:[cm]?[jt]s|[jt]sx)$/, '')
      .replace(/(^|\/)index$/, '');
    return `${alias}${subpath ? `/${subpath}` : ''}${modifier}`;
  }
  return undefined;
}

/**
 * Documentation-only adapter: no site config, TS config, producer lookup,
 * resolver initialization or migration baseline is needed for this policy.
 */
export function findDocumentationBoundaryImports(
  cwd: string,
  file: string,
  content: string,
) {
  const normalizedFile = posix(file);
  return parseImports(normalizedFile, content)
    .flatMap((record) => {
      const target = relativeBoundaryTarget(cwd, ossSourceAreas, {
        ...record,
        importer: normalizedFile,
        boundary: 'documentation',
      });
      if (target === undefined) return [];
      const modifierIndex = record.specifier.search(/[?#]/);
      const modifier =
        modifierIndex === -1 ? '' : record.specifier.slice(modifierIndex);
      return [
        {
          file: normalizedFile,
          line: record.line,
          specifier: record.specifier,
          target,
          suggestion: suggestedAlias(target, modifier),
        },
      ];
    })
    .sort((left, right) => left.line - right.line);
}
