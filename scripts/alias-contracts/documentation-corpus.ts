/** Final documentation ownership, snapshots and complete-tree coverage. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { repositoryRelativePathProblem } from './path-validation.js';
import type {
  DocumentationCorpus,
  DocumentationScope,
  Owner,
  PreparedDocument,
} from './types.js';

const record = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const normalized = (value: unknown): value is string =>
  repositoryRelativePathProblem(value, false) === undefined;
const digest = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const contains = (root: string, file: string) =>
  file === root || file.startsWith(`${root}/`);

function validateRoots(
  value: unknown,
  fail: (message: string) => never,
): string[] {
  if (!Array.isArray(value) || !value.length)
    fail('roots must be a non-empty array');
  const roots: string[] = [];
  for (const root of value) {
    if (!normalized(root)) fail('root must be a normalized relative path');
    if (contains('docs/public', root))
      fail('public resources are not documentation roots');
    if (roots.some((other) => contains(other, root) || contains(root, other)))
      fail(`overlapping roots '${root}'`);
    roots.push(root);
  }
  return roots;
}

/** Hash the UTF-8 text shared by the preparation inventory and scan. */
export const documentationDigest = (content: string): string =>
  createHash('sha256').update(content, 'utf8').digest('hex');

/** Validate complete-tree scanning independently of producer manifest schemas. */
export function validateDocumentationScope(
  value: unknown,
  owners: readonly Owner[],
): DocumentationScope {
  const fail = (message: string): never => {
    throw new Error(`Invalid documentationScope: ${message}`);
  };
  if (!record(value)) fail('must be an object');
  const data = value as Record<string, any>;
  validateRoots(data.roots, fail);
  if (
    data.trackedSource !== undefined &&
    (!record(data.trackedSource) ||
      !text(data.trackedSource.id) ||
      !owners.some((owner) => owner.id === data.trackedSource.owner))
  )
    fail('trackedSource must declare an id and registered owner');
  return structuredClone(data) as DocumentationScope;
}

/** Gate 1 validates data only; Gates 2/3 verify files after preparation. */
export function validateDocumentationCorpus(
  value: unknown,
  owners: readonly Owner[],
): DocumentationCorpus {
  const fail = (message: string): never => {
    throw new Error(`Invalid documentationCorpus: ${message}`);
  };
  if (!record(value)) fail('must be an object');
  const data = value as Record<string, any>;
  const roots = validateRoots(data.roots, fail);
  if (data.sources !== undefined)
    fail('sources/segments are retired; declare final file/import owners');
  if (!Array.isArray(data.files)) fail('files must be an array');
  const ownership = (value: Record<string, any>, file: string) => {
    if (!owners.some((owner) => owner.id === value.owner))
      fail(`file '${file}' has unknown owner`);
    if (
      value.origins !== undefined &&
      (!Array.isArray(value.origins) ||
        value.origins.some(
          (origin: unknown) =>
            !record(origin) ||
            !text(origin.repository) ||
            repositoryRelativePathProblem(origin.root, true) !== undefined,
        ))
    )
      fail(`file '${file}' has invalid canonical origins`);
  };
  const files = new Set<string>();
  for (const file of data.files) {
    if (!record(file) || !normalized(file.file))
      fail('prepared file must declare a normalized relative path');
    if (!roots.some((root) => contains(root, file.file)))
      fail(`file '${file.file}' is outside declared roots`);
    if (files.has(file.file)) fail(`duplicate prepared file '${file.file}'`);
    files.add(file.file);
    if (!digest(file.sha256)) fail(`file '${file.file}' has invalid sha256`);
    if (file.segments !== undefined)
      fail('sources/segments are retired; declare final file/import owners');
    ownership(file, file.file);
    if (file.imports !== undefined && !Array.isArray(file.imports))
      fail(`file '${file.file}' imports must be an array`);
    const indices = new Set<number>();
    for (const request of file.imports ?? []) {
      if (
        !record(request) ||
        !Number.isSafeInteger(request.index) ||
        request.index < 0 ||
        indices.has(request.index)
      )
        fail(`file '${file.file}' has invalid or duplicate import index`);
      if (!text(request.specifier))
        fail(
          `file '${file.file}' import ${request.index} must declare a specifier`,
        );
      indices.add(request.index);
      ownership(request, file.file);
    }
  }
  return structuredClone(data) as DocumentationCorpus;
}

export interface PreparedFile {
  file: PreparedDocument;
  content: string;
}

/**
 * Verify the complete declared trees, not just the supplied inventory.
 * docs/public and dependency/hidden directories are outside the executable
 * corpus, matching the existing documentation scan.
 */
function documentationFiles(
  cwd: string,
  roots: readonly string[],
  canonical: (file: string) => string,
): Set<string> {
  const absolute = (file: string) => path.resolve(cwd, file);
  const physicalContains = (root: string, file: string) =>
    file === root || file.startsWith(`${root}${path.sep}`);
  const publicRoot = canonical(absolute('docs/public'));
  const discovered = new Set<string>();
  const physicalRoots: string[] = [];
  for (const root of roots) {
    const real = canonical(absolute(root));
    if (physicalContains(publicRoot, real))
      throw new Error(`${root}: public resources are not documentation roots`);
    if (
      physicalRoots.some(
        (other) =>
          physicalContains(other, real) || physicalContains(real, other),
      )
    )
      throw new Error(`${root}: overlapping canonical documentation roots`);
    physicalRoots.push(real);
    if (!statSync(absolute(root), { throwIfNoEntry: false })?.isDirectory())
      throw new Error(`${root}: missing prepared documentation root`);
    const visited = new Set<string>();
    const walk = (file: string) => {
      const realFile = canonical(absolute(file));
      // Public mounts stay excluded even under another docs spelling.
      if (physicalContains(publicRoot, realFile)) return;
      if (!physicalContains(real, realFile))
        throw new Error(`${file}: prepared documentation escapes its root`);
      if (statSync(absolute(file)).isDirectory()) {
        if (visited.has(realFile))
          throw new Error(`${file}: repeated or cyclic documentation mount`);
        visited.add(realFile);
        for (const entry of readdirSync(absolute(file)).sort()) {
          if (entry.startsWith('.') || entry === 'node_modules') continue;
          if (file === 'docs' && entry === 'public') continue;
          walk(`${file}/${entry}`);
        }
      } else if (/\.(?:[cm]?[jt]sx?|mdx?)$/.test(file)) discovered.add(file);
    };
    walk(root);
  }
  return discovered;
}

/** Call once after preparation; the site supplies final ownership decisions. */
export function snapshotDocumentation(
  cwd: string,
  roots: readonly string[],
  ownership: (
    file: string,
    content: string,
  ) => Omit<PreparedDocument, 'file' | 'sha256'>,
  canonical: (file: string) => string,
): DocumentationCorpus {
  validateRoots(roots, (message) => {
    throw new Error(`Invalid documentationCorpus: ${message}`);
  });
  return {
    roots: [...roots],
    files: [...documentationFiles(cwd, roots, canonical)].sort().map((file) => {
      const content = readFileSync(path.resolve(cwd, file), 'utf8');
      return {
        ...ownership(file, content),
        file,
        sha256: documentationDigest(content),
      };
    }),
  };
}

/** Verify final hashes and inventory independently of the producer's snapshot. */
export function preparedDocumentation(
  cwd: string,
  data: DocumentationCorpus,
  canonical: (file: string) => string,
): Map<string, PreparedFile> {
  const discovered = documentationFiles(cwd, data.roots, canonical);
  const declared = new Map(data.files.map((file) => [file.file, file]));
  for (const file of discovered)
    if (!declared.has(file))
      throw new Error(
        `${file}: prepared documentation has no ownership record`,
      );
  for (const file of declared.keys())
    if (!discovered.has(file))
      throw new Error(
        `${file}: ownership record is outside the executable corpus`,
      );
  const result = new Map<string, PreparedFile>();
  for (const file of data.files) {
    const content = readFileSync(path.resolve(cwd, file.file), 'utf8');
    if (documentationDigest(content) !== file.sha256)
      throw new Error(
        `${file.file}: stale documentation snapshot; run prepare`,
      );
    const real = canonical(path.resolve(cwd, file.file));
    if (result.has(real))
      throw new Error(`${file.file}: conflicting canonical prepared files`);
    result.set(real, { file, content });
  }
  return result;
}
