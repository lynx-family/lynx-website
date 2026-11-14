/** Shared repository-relative path rules for registry and ownership data. */
import path from 'node:path';

/** Origin metadata accepts globs; filesystem roots and files remain concrete. */
export function repositoryRelativePathProblem(
  root: unknown,
  allowGlob: boolean,
): string | undefined {
  if (typeof root !== 'string' || !root.trim()) {
    return 'must be a non-empty repository-relative path';
  }
  if (
    path.posix.isAbsolute(root) ||
    /^[A-Za-z]:/.test(root) ||
    root.startsWith('\\\\')
  ) {
    return 'must be repository-relative, not absolute';
  }
  if (
    root.includes('\\') ||
    (!allowGlob && root.includes('*')) ||
    root === '.' ||
    root.endsWith('/') ||
    root.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    return 'must be a normalized repository-relative path';
  }
  return undefined;
}
