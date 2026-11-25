# @lynx-js/lynx-doc-transform

Shared documentation parsing and build transforms for Lynx sites. The package
ships ESM source and TypeScript declarations; it needs no build or prepare step.

## Consumption

The OSS site uses `"@lynx-js/lynx-doc-transform": "workspace:*"`. A downstream
site can install it from its pinned website submodule:

```json
{
  "devDependencies": {
    "@lynx-js/lynx-doc-transform": "file:./path/to/website/packages/lynx-doc-transform",
    "@rsbuild/core": "2.3.3"
  }
}
```

The parser declares its own runtime dependencies. The `/rsbuild` adapter uses
the consuming site's `@rsbuild/core` peer; parser-only consumers do not need
Rsbuild. Keep the host aligned with the audited Rspress/Rsbuild versions below.

```ts
import path from 'node:path';
import { pluginVersionBindings } from '@lynx-js/lynx-doc-transform/rsbuild';

export default {
  builderConfig: {
    plugins: [
      pluginVersionBindings({
        versionFile: path.resolve('docs/public/version.json'),
      }),
    ],
  },
};
```

Resolve paths from the consuming site's root or configuration location.
The package never locates a website checkout or reads OSS metadata implicitly.

The `/parser` entry exports `prepareDocumentation`, `parseDocumentation`,
`compileDocumentation`, and `parseDocumentationCode`. For example:

```js
import { parseDocumentationCode } from '@lynx-js/lynx-doc-transform/parser';

const source = '`example`';
const { tree, ranges } = parseDocumentationCode('guide.mdx', source);
// ranges: [{ start: 1, end: 8, type: 'inlineCode' }]
```

There is no root export or public source-file subpath. The binding resolver and
source editor remain internal; site-specific CI policy stays in the website.

## Documentation version bindings

`pluginVersionBindings` is a Rsbuild `api.transform` pre-transform shared by
the HTML and Markdown-export compilers. The site supplies an absolute
`versionFile` path; downstream sites must register the plugin in their own
`builderConfig.plugins` with their own metadata path.

Only the exact `{versionJson.LYNX_VERSION}` and
`{versionJson.PRIMJS_VERSION}` spellings inside Markdown code contents resolve.
This includes fenced and inline code, and indented code in `.md` files.
Suffixes such as `-debug` remain authored text. Other uppercase keys fail with
the original file, line, and column. Missing values and values containing
whitespace or Markdown delimiters also fail.

The transform does not evaluate JavaScript or change frontmatter, prose,
JSX/ESM, fence metadata, or imports. It processes imported Markdown modules
wherever they live, including shared and generated documentation. Each module
uses the consuming build's context; parent pages do not pass context to
fragments. `?raw` requests remain literal. To document the binding syntax
itself, callers can provide exact absolute paths in `literalDocuments`.
External snippets loaded later by Rspress's `file=` remark plugin are outside
this transform; snippet files do not inherit Markdown module context.
Rspress extracts route descriptions and search metadata before compiler
transforms. Give pages an explicit frontmatter description to keep bindings
out of automatically extracted descriptions.

Before build and development compilation, including watch rebuilds, the
plugin reads metadata into a new frozen snapshot. All environments share a
replaceable reference to that snapshot. Overlapping watch cycles are not
isolated: a later transform in an earlier cycle may read a snapshot published
by a newer refresh. Each synchronous transform uses the snapshot passed to it.
Transformed modules register the metadata file as a dependency, so changing
it invalidates cached modules. Refresh reads the small metadata file
synchronously without yielding between clearing and replacing the snapshot.
A failed read leaves it unset instead of retaining stale metadata.
Ordinary builds fail immediately on metadata errors. Watch and development
compilation report the error from dependent modules after registering the
metadata dependency, so correcting the JSON or recreating a missing file
triggers recompilation without restarting the watcher.
There is no module-global metadata or result cache.

## Parser and source maps

The `/parser` entry shares the audited Rspress syntax contract
with documentation CI. Metadata removal and heading-ID escaping retain a
piecewise map to original UTF-16 source offsets. The public mdast compiler
`beforeEnter` hook identifies code content tokens without replacing parser
handlers. Container prefixes, delimiters, metadata, and synthetic characters
are excluded from editable ranges. Tests compare the collected tree with the
ordinary parser tree; dependency upgrades must preserve this contract.
The Rspress MDX audit in `scripts/ci/check-doc-import-boundaries.test.mjs`
pins the reviewed Rspress and Rsbuild versions and checks that the project's
package MDX pipeline dependencies resolve to the same installations as Rspress.
Updating either audited version requires reviewing the transform and watch
contracts and running the listed parser, binding, and integration tests.

Edits validate their original substring and cannot overlap. MagicString emits
a high-resolution map from transformed Markdown to original Markdown.
**Rspress 2.1.4's MDX loader discards incoming source maps**; this plugin cannot
provide an end-to-end JavaScript-to-original-MDX map until that upstream
loader supports map composition. CI's existing source-line semantics remain
unchanged.

## Verification

```sh
pnpm --filter @lynx-js/lynx-doc-transform run test
pnpm --filter @lynx-js/lynx-doc-transform run test:integration
pnpm --filter @lynx-js/lynx-doc-transform run pack:check
pnpm run prepare
pnpm run build
```

The integration fixture builds real Rspress HTML, page Markdown, and
`llms-full.txt`, including an imported fragment outside the docs root.
It also changes only the metadata file during real Rsbuild watch builds and
development compilation, checking recovery from invalid JSON and missing
files in all three compiler environments, including failures on startup.
The pack check installs a tarball into an isolated temporary consumer and
verifies public imports, TypeScript declarations, and a real Rsbuild transform.
All fixtures and command logs live in the operating system's temporary directory.
The Validate CI job runs integration and pack checks; Documentation Imports
runs the unit tests without prepare. Downstream adoption also requires a build
against the updated OSS pin using the consuming site's own configuration.
