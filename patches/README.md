# Dependency patches

## React DOM 18.3.1

`react-dom@18.3.1.patch` backports
[React #26228](https://github.com/react/react/pull/26228) to the Node
development and production streaming renderers.

When a UTF-8 character does not fit at the end of a buffer, React 18
writes the entire buffer, including unused NUL bytes. The patch writes
only the used bytes. This prevents generated text and heading IDs from
being corrupted without changing the React major version.

The installed-renderer tests run in CI. The HTML build also rejects NUL
before postprocessing, so an omitted patch cannot silently publish
corrupted output.

Keep the patch until the installed React DOM release includes the
upstream fix. Then remove its `patchedDependencies` entry and regenerate
the lockfile; retain the rendering tests and HTML check.

Consumers with their own dependency installation must apply the same fix
until their React DOM version includes it.
