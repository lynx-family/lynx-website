/** Translate the OSS documentation-package manifest format into source data. */
import { repositoryRelativePathProblem } from './path-validation.js';
import type { OwnerId, SourceArea } from './types.js';

interface ManifestBinding {
  owner: OwnerId;
  repository: string;
  sourceRoot: string;
  outputRoot: string;
}

const record = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const normalized = (value: unknown): value is string =>
  repositoryRelativePathProblem(value, false) === undefined;
const contains = (root: string, file: string): boolean =>
  file === root || file.startsWith(`${root}/`);

/** The binding supplies ownership and paths; neither is inferred from names. */
export function manifestSourceAreas(
  value: unknown,
  binding: ManifestBinding,
): SourceArea[] {
  const fail = (message: string): never => {
    throw new Error(`Invalid documentation manifest: ${message}`);
  };
  if (!record(value) || !Array.isArray(value.sections))
    fail('sections must be an array');
  if (
    !normalized(binding.outputRoot) ||
    contains('docs/public', binding.outputRoot) ||
    (binding.sourceRoot !== '' && !normalized(binding.sourceRoot)) ||
    !binding.repository.trim()
  )
    fail('invalid source/output binding');
  const data = value as Record<string, any>;
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1)
    fail('unsupported schemaVersion');
  const areas: SourceArea[] = [];
  const add = (id: string, destination: string, source: string) => {
    if (!normalized(destination) || !normalized(source))
      fail('invalid destination/source');
    const root = `${binding.outputRoot}/${destination}`;
    if (
      contains('public', destination) ||
      contains('docs/public', root) ||
      areas.some(
        (area) => contains(area.root, root) || contains(root, area.root),
      )
    )
      fail('public or overlapping destinations');
    areas.push({
      id: `${binding.owner}:${id}`,
      root,
      owner: binding.owner,
      role: 'generated',
      boundary: 'documentation',
      origins: [
        {
          repository: binding.repository,
          root: binding.sourceRoot ? `${binding.sourceRoot}/${source}` : source,
        },
      ],
    });
  };
  for (const section of data.sections) {
    if (
      !record(section) ||
      !normalized(section.route) ||
      !record(section.content)
    )
      fail('invalid section');
    for (const [locale, source] of Object.entries(section.content)) {
      if (!normalized(locale) || locale.includes('/') || !normalized(source))
        fail('invalid locale/source');
      add(
        `${locale}:${section.route}`,
        `${locale}/${section.route}`,
        source as string,
      );
    }
  }
  if (data.sharedContent !== undefined && !Array.isArray(data.sharedContent))
    fail('sharedContent must be an array');
  for (const entry of data.sharedContent ?? []) {
    if (
      !record(entry) ||
      !normalized(entry.destination) ||
      !normalized(entry.source)
    )
      fail('invalid shared destination/source');
    add(`shared:${entry.destination}`, entry.destination, entry.source);
  }
  return areas;
}
