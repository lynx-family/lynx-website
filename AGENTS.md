# Repository Instructions

## Contribution Workflow

Follow the [commit](./CONTRIBUTING.md#commits) and
[pull request](./CONTRIBUTING.md#pull-requests) conventions in
`CONTRIBUTING.md`. Automated reviewers must also follow the policy
embedded in [the pull request template](./.github/pull_request_template.md).

## Downstream Compatibility

This repository is consumed by the in-house Lynx documentation site through a
pinned git submodule and local `file:` dependency.

### Directly Consumed Paths

The downstream prepare flow consumes these OSS paths:

- Copied or merged content: `docs/`, `i18n.json`, and `sharedDocs/`
- Symlinked runtime: `src/` and `theme/`
- Imported configuration: `tailwind.config.js`
- Package contract: `package.json`
- Generated-data inputs: `packages/lynx-living-spec/`,
  `packages/lynx-compat-data/`, `packages/lynx-example-packages/`,
  `packages/lynx-ui-example-packages/`, and
  `packages/lynxtron-example-packages/`

The downstream repository replaces `docs/public/lynx-examples` and applies
internal content overlays after copying OSS content.

### Downstream Tool Contract

The downstream prepare flow directly executes:

- `scripts/luna-demo.js`
- `scripts/lynx-example.js`

The downstream directly executes `scripts/lynx-living-spec.js` from its
installed `lynx-doc` dependency through its own Living Spec orchestration layer.
It prepares downstream source overlays first and runs the generator with the
downstream repository root as the working directory.

Keep these script paths, caller-working-directory behavior, environment
variables, and generated output layouts compatible with downstream callers.

### Mirrored Integration Contracts

The downstream repository maintains local versions of
`shared-route-config.ts`, `shared-og-config.ts`, `rspress.config.ts`, and
`tsconfig.json`. These files are not copied from OSS, but their runtime
contracts must remain compatible.

Keep OSS runtime imports compatible with the downstream resolver aliases.
Coordinate changes to shared configuration exports or resolver aliases with
the downstream repository.

### Compatibility Changes

- Treat consumed paths, package names, script environment variables, output
  directories, and exported configuration fields as interfaces. Do not rename,
  remove, or change them without a compatibility plan and coordinated
  downstream update.
- Keep internal-only content and behavior in the in-house repository.

The in-house scheduled sync runs daily at 09:30 UTC+8. For coordinated changes,
especially those that must land internally first, plan the landing order around
this window so an OSS change is not synced before its downstream counterpart is
ready.

### Verification

When a change affects any downstream compatibility contract above, verify this
repository with:

```sh
pnpm run prepare
pnpm run build
```

Then request validation against the updated OSS pin in the in-house repository,
following that repository's own setup and build instructions.

## Portable Build and Generation Tooling

Prepare and build tooling runs across local development, GitHub Actions,
Cloudflare Pages, Netlify, and downstream consumers. Node-based generators must
not invoke undeclared host commands. In particular, do not depend on `rsync`;
it is not available in every Cloudflare Pages build image supported by this
site.

Prefer `node:*` APIs or declared package dependencies. If an operating-system
tool is unavoidable, explicitly provision it in every caller and supported
build image, document the prerequisite, and add CI coverage for its absence or
availability. A command being installed on a developer machine or GitHub-hosted
runner does not make it part of the build contract.

### `api-stats.json` doc links

`packages/lynx-compat-data`'s `gen-stats` emits a `doc_url` per API. **When the
caller supplies a docs root** — via `--docs-root <dir>` (resolved against the
working directory) or `LYNX_COMPAT_DOCS_ROOT` — it emits only the URLs that
resolve to a route in that tree; without one it emits every URL unchecked. The
OSS site supplies its own root through the `gen:compat-stats` script, which is
therefore the script to use when regenerating these stats by hand. The root is
never inferred from the package's location, so an install layout cannot decide
which routes the data is checked against.

A consumer that generates these stats itself should pass its own docs root, and
gets a `doc_url` set matching the pages it publishes. Omitting the option skips
verification and emits every URL unchecked; naming a root that does not exist
is an error rather than a silent skip, so a run either verifies against the
tree it was told to use or does not verify at all.

## Generated Documentation

The contributor-facing rules in
[Generated Documentation](./CONTRIBUTING.md#generated-documentation) are the
source of truth.

CI must run documentation syncs and generators whose outputs are committed,
then fail on additions, modifications, deletions, or untracked output files.
When adding such a tool, include its complete output set in the consistency
check.

## Documentation Runtime Imports

The contributor-facing rules, examples, and alias selection table in
[Portable Documentation Imports](./CONTRIBUTING.md#portable-documentation-imports)
are the source of truth. Automated changes to `docs/` and `sharedDocs/` must
follow them.

### Resolver Details

The `@` alias resolves directly to `src` in OSS, but downstream consumers may
configure it as an ordered list of source roots. The resolver uses the first
matching path; it does not merge directories or barrel exports. Existing `@/*`
imports remain **temporarily** supported for compatibility, but do not add one
for a new OSS documentation component when an `@lynx/*` import is available.

Likewise, a downstream `@lynx` alias may search multiple component roots. A
subpath such as `@lynx/example` can fall through until that component exists,
while the bare `@lynx` import stops at the first resolvable barrel. Use the
barrel only when the export is present in every consumer's first matching
barrel.

The OSS `@luna` alias is an exact-match barrel for `src/luna/index.ts`. Shared
documentation must use only the bare `@luna` import so consumers need to
provide the same barrel contract, not internal Luna subpaths.

Do not add a new alias or change alias ordering without coordinating the exact
contract with downstream consumers.

### Boundary Check

The `scripts/ci/check-doc-import-boundaries.mjs` check enforces this boundary.
It parses documents using direct MDX and syntax-plugin dependencies aligned
with Rspress, then checks static imports, re-exports, and statically known
dynamic imports in the AST. It does not execute documents or evaluate computed
import sources. Preserve Rspress's `.md`/`.mdx` distinction, frontmatter
handling, and heading-ID escaping when updating the parser; plain Markdown
examples are not executable imports. Parse failures must fail the check, not
silently skip files. Relative imports into `src/` or `theme/` are forbidden;
relative imports that remain within the documentation tree are allowed. The
check does not enforce alias ownership or canonicalize existing alias imports.

Replacement suggestions derive only from the resolved source path. They may
normalize known JS/TS extensions and trailing `index` files, but must not infer
ownership from imported symbol names or guess aliases for undocumented source
roots.

Keep parser dependencies explicit rather than importing Rspress internals.
The `Documentation Imports` CI job installs dependencies with lifecycle scripts
disabled and checks committed documents without root `prepare`. Keep the
separate `Generator Portability` job dependency-free.

## Host-Root Imports

`@site` resolves to the consuming site's repository root. Existing `@site/*`
imports remain **temporarily** supported as part of the current OSS/downstream
compatibility surface.

Do not add new `@site/*` dependencies. For new code:

- Use a relative import when the target remains inside the owning OSS module.
- Use an OSS-owned package export for reusable shared code.
- Use a documented exact-match resolver alias when a downstream site must
  intentionally inject configuration. For example, `@og-config` is configured
  as the exact-match `@og-config$` alias in Rspress.

## Change Rules

Apply the section-specific rules above, including the resolver, host-root, and
generated-documentation constraints, to changes in those areas.

- Call out changes to CI, build or generation workflows, release behavior, or
  downstream interfaces explicitly in the commit message and pull request
  description.
- All pull requests require human review and must be merged manually. Review
  agents may approve changes but must not auto-merge them.
