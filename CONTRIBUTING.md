# Contributing

Thanks for contributing to the Lynx website and documentation.

## Developing

### Prerequisites

_Node_: Use Node.js 22 or newer. You can check this with:

```bash
node -v
```

_pnpm_: Make sure pnpm is available. `corepack enable` is recommended.

### Setup

```bash
pnpm install
```

Some generated data is produced during `pnpm install` through the `prepare`
script. If you change generated sources or sync tooling, run `pnpm run prepare`
before building.

### Local Development

```bash
pnpm run dev
```

Open [http://localhost:3000/](http://localhost:3000/).

### Building

```bash
pnpm run build
```

To preview the production build locally:

```bash
pnpm run preview
```

## Checks

Before opening a pull request, run the relevant checks for your change:

### General

```bash
pnpm run format:check
pnpm run build
```

### Documentation Imports

For changes to imports in `docs/` or `sharedDocs/`, also run:

```bash
pnpm run check:doc-import-boundaries
```

The check parses documents without executing them, using Rspress-aligned
Markdown/MDX syntax. It reports parse errors as well as import violations.
For checker changes, also run:

```bash
node --test scripts/ci/check-doc-import-boundaries.test.mjs
```

MDX imports must be used in executable JSX, expressions, or exports. Check all
site-owned MDX with:

```bash
pnpm run check:doc-unused-imports
```

The check analyzes MDX without executing it. It excludes Lynxtron, synchronized
lynx-ui docs, and API sections owned by `@lynx-js/lynx-stack-docs`.

For changes to this checker, also run:

```bash
node --test scripts/ci/check-doc-unused-imports.test.mjs
```

### Writing Style

Keep English and Chinese document headings consistent in count, order, and
level. Heading text should follow the language of each page.

For heading changes, run the check enforced by **Writing Style** CI:

```bash
pnpm run check:doc-heading-parity
```

### Go Components

For changes to rendered `Go` components in `docs/` or `sharedDocs/`, run:

```bash
pnpm run check:go-components
```

When changing `defaultEntryName` selectors or generated example metadata, run
`pnpm run prepare` first, then validate selectors against that metadata:

```bash
pnpm run check:go-component-entries
```

For changes to the `Go` component checker, also run:

```bash
node --test scripts/ci/check-go-components.test.mjs
```

### Example Generators

For changes to the core Lynx example generator, run:

```bash
pnpm run test:lynx-example
```

For changes that affect the Luna or Lynxtron generators, or shared behavior
across generators, run the complete suite:

```bash
pnpm run test:example-generators
```

### Lynx Compatibility Data

For changes under `packages/lynx-compat-data`, run:

```bash
pnpm --filter @lynx-js/lynx-compat-data run pack:check
```

This verifies that generated CSS property compatibility data is present in the
package tarball without committing `css/properties/*.json` to git.

## Media Assets

Use approved immutable documentation CDN URLs for documentation media by
default. Do not add a local copy merely to make an image available to a
documentation page. Existing local assets used by site UI under `src/` or
`theme/` are outside this documentation-media policy and do not need to be
migrated.

PR and merge-queue CI runs the `media-budget` job, which checks new regular-file
blobs for common media types, including but not limited to GIF, PNG, JPEG,
WebP, WebM, MP4, SVG, PDF, and fonts, across the repository:

- Warn above 50 KiB per new blob.
- Fail above 100 KiB per new blob or 512 KiB total new media per PR.
- Count identical new blobs once, but do not give deletion credit.

If an asset cannot meet the budget, ask a maintainer to decide
whether a reviewed exception is appropriate.

Use `scripts/media/process-doc-media.sh` to list candidates or create local
GIF/WebM and image/WebP conversions for review before CDN upload. It never
uploads files or modifies documentation sources. See
[Media tools](./scripts/media/README.md) for usage and required local encoders.

## Generated Documentation

Generated or synchronized documentation committed to the repository must match
the current source revision and generation tooling. Run the relevant generator
after changing either input, and commit all resulting additions, modifications,
and deletions. CI consistency checks must cover the complete output set.

For example, `pnpm run prepare` fetches the revision in `lynx-ui.version`,
copies its package documentation into `sharedDocs/packageDocs/`, and generates
`sharedDocs/lynx-ui-intros.ts` from package introductions. After changing that
revision or its sync and generation tooling, run `pnpm run prepare` and commit
all changes in those output paths.

For the complete lynx-ui refresh workflow, including example version checks
and `Go` highlight updates, see the
[lynx-ui update skill](./.agents/skills/lynx-ui-docs-update/SKILL.md).

The API reference for lynx-stack packages is written and generated in
[lynx-stack](https://github.com/lynx-family/lynx-stack/tree/main/docs/content)
and copied here from the `@lynx-js/lynx-stack-docs` package by
`pnpm run sync:lynx-stack-docs`, which `pnpm install` runs as part of
`prepare`. The sections the package's `manifest.json` lists (`api/config`,
`api/genui`, `api/react` and `api/packages`, in both locales) are not
committed: change those pages in lynx-stack, then update
`@lynx-js/lynx-stack-docs` here. Old `/api/rspeedy`, `/api/react`,
testing-library and GenUI URLs are redirected by
`netlify/edge-functions/lynx-stack-api-redirects/`.

The agent-lynx and Agent Skills guides, conversation components, and interactive demos are
maintained in
[skills/packages/skills-docs](https://github.com/lynx-community/skills/tree/main/packages/skills-docs).
`pnpm run sync:skills-docs` mounts `@lynx-js/skills-docs` during
`prepare`. Its generated pages (`docs/{en,zh}/ai/agent-lynx` and
`docs/{en,zh}/ai/skills`), shared modules
(`docs/_ai`), public assets (`docs/public/ai/agent-lynx`), and AI
navigation (`docs/{en,zh}/ai/_meta.json`) are ignored. Change other AI navigation
in `_meta.template.json`; the `agent-lynx` and `skills` slots expand from the
package's localized navigation. The website owns the AI landing page, overall
section order, AGENTS.md guide, and MCP guides. Edit packaged content in skills
and update this single dependency when it is released.

Site-owned pages that must stay under an existing generated route live in
`docs-own/{en,zh}/<route>`. `sync:skills-docs` copies them after the package
content and merges their local `_meta.json` entries using `before` or `after`
anchors. A package page with the same name keeps precedence during migration;
once the package stops shipping it, the site-owned page takes over. A2UI and
OpenUI use this path.

For joint development, run the sync watcher alongside the website dev server:

```bash
SKILLS_DOCS_SOURCE=/path/to/skills/packages/skills-docs pnpm sync:skills-docs --watch
```

The package uses full `https://lynxjs.org/...` links for other website sections.
As with lynx-stack, synchronization makes these links site-relative only when
the target page exists in this checkout. The website build checks the resulting
internal links; the package's standalone preview checks its own pages and
anchors. The generated edit links point to the original files in skills.

## Theme and Component Design

For site UI changes under `src/` and `theme/`, see the
[Theme and Component Design guide](./src/README.md). It covers visual
consistency, component ownership, style overrides, and compatibility checks.

## CSS Reference Style

- Include a non-empty frontmatter `title` in CSS property and data-type
  references. Existing explicit H1 titles remain supported; keep their text
  consistent with the frontmatter title.
- Nest H3 `Values` under H2 `Syntax`. When values have individual headings,
  use H4, preserving their anchors and matching the other locale. Do not skip
  to H5 or replace anchored headings with standalone bold paragraphs.
  Existing value lists may be retained; adopting an anchored definition-list
  format is a separate change.
- Record initial values in `Formal definition`. Additional default-value notes
  belong in the relevant value description, without a separate default-value
  heading.
- Use `Differences from the Web` only for concrete Lynx behavior differences.
  Put reference links without a difference explanation under `See also`.
- In data-type references, `Units` is an H2 peer of `Syntax`; unit groups use
  H3.
- Keep heading and formatting corrections separate from missing translations,
  examples, and behavior explanations.

## Deployment Portability

Build and generation scripts must remain portable across GitHub Actions,
Cloudflare Pages, and Netlify build images. Do not add dependencies on
undeclared host commands such as `rsync`; see
[Portable Build and Generation Tooling](./AGENTS.md#portable-build-and-generation-tooling).

## Downstream Compatibility

This repository is consumed by downstream documentation sites through a pinned
revision. Changes to shared docs, runtime source, theme files, scripts, package
metadata, generated data inputs, or shared configuration exports can affect
those consumers.

Read [AGENTS.md](./AGENTS.md) before changing compatibility-sensitive paths.
When a change affects the downstream contract, run:

```bash
pnpm run prepare
pnpm run build
```

Then request downstream validation after the updated OSS revision is pinned.

### Shared Theme Slots

`Layout.beforeDocContent` defaults to the exported `BeforeDocContent` aggregate.
Downstream themes should compose that export with their own UI: custom content
replaces the slot, and `null` disables it. See the
[component contract and example](./theme/BeforeDocContent.tsx).

The export and slot semantics are downstream interfaces. Coordinate pin and
composition updates in the same change, accounting for the daily sync window.
Validate that shared and consumer content render exactly once and that caller
overrides still work.

### Alias Contracts

Portable resolver aliases are downstream interfaces. Follow the
[alias contract guide](./scripts/alias-contracts/README.md) when changing alias
policy, source ownership, resolver overrides, or checker behavior.

- Keep shared policy in `registry.ts` and physical roots in source maps; do not
  maintain file inventories for alias subpaths.
- Keep consumer-private aliases in consumer modules, never in the shared
  registry.
- Declare exact local exceptions with their lifecycle and removal condition.

Shared runtime hooks belong in `src/hooks`; theme-specific hooks belong in
`theme/hooks`. Within `src`, prefer relative imports such as `../../hooks`.
OSS theme code imports shared hooks through concrete `@/hooks/use-*` entries.
See [Shared Hooks Across Runtime Mounts](./scripts/alias-contracts/UNDERSTANDING.md#shared-hooks-across-runtime-mounts)
for ownership and downstream layout details.

For registry or checker changes, run:

```bash
pnpm check:aliases
pnpm run prepare
pnpm check:alias-resolution
pnpm check:import-policy
pnpm run build
```

`check:aliases` runs the complete gate fixture suite without prepare. The
resolver and import-policy commands check the prepared repository. Migration
baselines record exact occurrences: remove or reduce entries alongside source
migrations; never add allowances for new, moved, or changed imports. Update
authoritative generator settings before regenerating their output. See the
[baseline workflow](./scripts/alias-contracts/README.md#import-policy-and-baseline-shrinking).

Changes to packaged
checker interfaces also require downstream validation against the exact
candidate revision. See the
[understanding guide](./scripts/alias-contracts/UNDERSTANDING.md) for gate
architecture and scope.

### Portable Documentation Imports

Documentation runtime modules and public assets have different portability
contracts. Public files are URL-addressed resources rather than code modules.

#### Public Asset References

Rspress copies every file under `docs/public` into the build output while
preserving its path relative to that directory. These public files are
URL-addressed resources, not code modules.

Do not import from the retired `@assets` namespace in `docs/` or `sharedDocs/`.
Files under `docs/public/assets` are public URLs rather than modules, and
importing one would emit a bundled copy in addition to the public copy. There
is no replacement asset alias: use an approved immutable documentation CDN URL
by default.

When a document intentionally uses an existing public file, standard Markdown
origin-root URLs are version-aware because Rspress resolves them under the
configured documentation base:

```mdx
![Diagram](/assets/diagram.png)
```

Raw HTML and explicit MDX JSX props do not receive that standard Markdown image
handling. An unnormalized origin-root public URL such as `/assets/...` on a page
under `/4.0/` requests the current root deployment instead of
`/4.0/assets/...`. Prefer the CDN URL, or normalize an existing public URL
explicitly:

```mdx
import { normalizeImagePath } from '@rspress/core/runtime';

<img src={normalizeImagePath('/assets/diagram.png')} />
<Go img="https://lf-lynx.tiktok-cdns.com/obj/example.gif" />
```

See the
[Rspress static assets documentation](https://rspress.rs/guide/basic/static-assets)
for the `normalizeImagePath` contract. The `Go` component is stricter: its
`img` prop must be a string literal whose origin is in the approved HTTPS CDN
allowlist in `scripts/ci/check-go-components.mjs`; it cannot reference a public
file. Do not couple a document to the physical layout of `docs/public`:

```mdx
![Diagram](../../public/assets/diagram.png)
```

#### Runtime Source Imports

In this repository, `docs/` and `sharedDocs/` happen to have fixed relative
positions next to `src/` and `theme/`, so imports such as
`../../src/components/...` can appear to work. Downstream sites copy the
documentation into their own trees but mount OSS runtime source and theme
files at consumer-specific paths. The same relative import can therefore
resolve to consumer code, or to no module at all, instead of the OSS module.

The boundary check enforces only this layout rule: executable imports in
`docs/` and `sharedDocs/` must not reach `src/` or `theme/` through relative
paths. It does not validate the ownership of existing alias imports or reject
historical forms such as `@lynx/index` and `@lynx-ui/index`.

Do not rely on the relative position of a documentation file and runtime
source. Use a shared resolver alias whenever a file under `docs/` or
`sharedDocs/` imports runtime source:

```ts
// Incorrect: depends on the OSS checkout layout.
import { Example } from '../../../../src/components/example';

// Correct: resolves through the shared OSS/downstream entry.
import { Example } from '@lynx';
```

For new imports of runtime components or shared content modules, choose the
narrowest shared entry points:

| Dependencies used by documentation pages           | Import form      |
| -------------------------------------------------- | ---------------- |
| Components exported by the OSS shared entry point  | `@lynx`          |
| Components exported by the `lynx-ui` shared entry  | `@lynx-ui`       |
| Luna components exported by its exact entry point  | `@luna`          |
| API Status components exported by the OSS barrel   | `@api-status`    |
| Shared package-document modules                    | `@docs/<path>`   |
| Host route metadata and helpers                    | `@route-config`  |
| Published host version metadata                    | `@version-data`  |
| Public exports of the active Rspress theme         | `@theme`         |
| MDX fragments kept within `docs/` or `sharedDocs/` | Relative imports |

Prefer the public exports of bare `@theme`, the Rspress-governed theme entry.
Direct source imports through `@theme/*` should be rare and used only when
selecting the active site's theme implementation is intentional.

`@luna` is an exact-match barrel for `src/luna/index.ts`. Use only the bare
alias; `@luna/*` subpaths are not part of the shared resolver contract.

`@route-config` and `@version-data` are exact host-provided entries. Bind them
in both runtime and TypeScript configuration before consuming updated OSS
source. They expose the existing route configuration exports and the default
version metadata object; their physical paths belong to the active host.

`@api-status` is the exact-match OSS barrel for API Status components,
separate from the extensible `@lynx` document-component barrel. It currently
exports `APIStatusLayout`. Consumers bind it directly to the mounted OSS
`src/components/api-status/index.ts` in both runtime and TypeScript
resolution; no subpaths, fallback roots, or consumer wrapper are supported.
Coordinate that binding before pinning a revision whose documentation uses
the entry.

For new imports, omit JS/TS file extensions and a trailing `/index`. Existing
imports that include `/index` remain supported and can be migrated separately.
Existing `@lynx/*` and `@lynx-ui/*` direct imports are migration debt, not
stable file-level Component APIs. Before replacing a relative or private
component import, export the symbol from the owning bare entry in every
consumer, then import it from that entry.

Treat each alias as an ownership boundary. Import a symbol from the entry point
that owns it, even if another site currently re-exports that symbol from an
aggregate barrel:

```ts
// Incorrect: relies on a downstream @lynx barrel re-exporting lynx-ui.
import { UIApiTable } from '@lynx';

// Correct: owned by the lynx-ui documentation components.
import { UIApiTable } from '@lynx-ui';
```

Some downstream resolvers map one alias to an ordered list of source roots.
Those roots are fallbacks, not a merged namespace: resolution stops at the
first matching module. A downstream bare `@lynx` or `@lynx-ui` wrapper must
re-export the complete OSS barrel and may add uniquely named exports.
Existing direct component subpaths must resolve to OSS-owned source; a
consumer-owned replacement is a migration violation even if its exports
look compatible. Coordinate bare exports before shared documents use them.

Existing `@/*` imports remain **temporarily** supported for compatibility, but do
not add one for a new OSS documentation component. Promote the component
through the owning bare barrel. Downstream consumers may resolve `@` through
multiple source roots, where an earlier match shadows later roots.

## Commits

- Follow [Conventional Commits](https://www.conventionalcommits.org/) for
  commit subjects.
- Optional scopes MUST use lowercase kebab-case in commit and pull request
  subjects.
- Keep the subject focused; prefer no more than 72 characters per line.
- Use concise, direct English.
- Use the body to explain what changed, why it was needed, and how it
  was verified or affects users. Use clear paragraphs or bullets; fixed
  subsection headings are not required.
- Use optional footers in the following form:

```text
issue: #12345
doc: https://example.com
TEST: Relevant test cases
```

Use exactly one `TEST` footer. It MUST concisely summarize validation rather
than enumerate individual commands. Use lowercase `issue` and `doc`.

## Pull Requests

- Base normal changes on `main`.
- Format pull request titles as Conventional Commit subjects.
- Pull request title subjects must contain at least 3 non-whitespace
  characters and be no longer than 72 characters.
- Renovate dependency pull requests may use longer subjects when their
  generated package name and version require it.
- Keep pull requests focused on one behavior or documentation update.
- Keep descriptions structured and concise. Use sections such as
  Summary, Rationale, Verification, and Documentation when helpful.
- Include enough context for reviewers to understand the user impact,
  affected pages, and validation performed.
- Prefer no more than 72 characters per line, except where a URL or code
  sample cannot be wrapped clearly.
- Do not include internal-only content, private URLs, or downstream-only
  implementation details in this OSS repository.

## Release Cherry-picks and Backports

This section is the source of truth for choosing source and target branches for
release backports.

### Branch Direction

Open a pull request from a topic or development branch into the newest branch
to which the change applies. The pull request base is normally `main`. Use a
release branch as the base only in the rare case that the change is
intentionally specific to that release and does not apply to `main`.

When the same change is needed on older releases, cherry-pick it from the
newest applicable branch toward older release branches. Never cherry-pick from
an older release branch into a newer release branch or into `main`. If a fix
applies to `main`, land it there before backporting it.

The automated Cherry-pick request workflow accepts only a source pull request
merged into the repository's default branch, currently `main`, that does not
change files under `.github/workflows/`. A pull request with a release branch
as its base cannot be used as the automated source.

Backport a release-specific source pull request manually. For each target,
create a topic or development branch and open a separate pull request for
normal review and approval. Use
`[release/x.y] <original-commit-subject>` for a literal cherry-pick or
`[release/x.y] <concise-subject>` for an adapted backport. Do not land an
equivalent change on `main` solely to make it eligible for the automated
workflow. Handle workflow-changing sources manually or with an explicitly
permitted token as described in [Configuration](#configuration).

### Requesting a Release Cherry-pick

Release cherry-picks are requested through the **Cherry-pick request** issue
form. Comment commands such as `/cherry-pick release/4.0` are no longer a
supported entry point.

This keeps write-capable automation behind an explicit repository-permission
approval step and gives each request a durable audit trail.

To request a release cherry-pick:

1. Open a new issue with the **Cherry-pick request** issue form.
2. Enter the merged source pull request.
3. Select one or more target release branches.
4. Explain why the change is needed and choose a risk level.
5. Wait for a user with repository triage access or greater to add
   `cherry-pick:request`. Automation does not run before this label is added.
6. Wait for validation to mark the request as pending approval.
7. A user with write, maintain, or admin permission must add the
   `cherry-pick:approved` label to start execution.

The workflow creates pull requests only. Generated cherry-pick pull requests
still require the normal review, required checks, CODEOWNERS, and branch
protection process.

#### Maintainer approval and retries

Before adding `cherry-pick:approved`, verify the request details shown in the
Issue. The workflow records those details and the approver, then starts that
version of the request. Editing or closing the Issue afterward does not change
or cancel work that has already started.

The workflow automatically removes `cherry-pick:approved` after recording the
approval. This does not cancel the execution. Adding the label while another
execution is running is ignored; wait for the active run to finish before
approving another attempt.

If a target conflicts or fails, fix the issue manually or update the request,
ensure `cherry-pick:approved` is absent, then add it to retry. Targets that
already produced a valid generated pull request are skipped on retry.

If validation or execution is interrupted after approval, the recovery job
removes the approval label and moves the request to `cherry-pick:failed`. Inspect
the failed workflow run before approving the request again.

#### Adding newly enabled targets

An existing request can be reused after another release branch is explicitly
enabled in the workflow configuration. Edit **Target release branches** in the
Issue body and add a checked item such as `- [x] release/4.1`, then reopen the
Issue if it is closed.

Editing or reopening the request revalidates it and returns a valid request to
`cherry-pick:pending-approval`. Changing the source PR (which is prohibited and
makes the request invalid), target branches, or risk level, and every reopen,
clears the previous approval metadata. A reason-only edit does not change the
approval fingerprint, but execution still requires a new approval label event
after revalidation. A user with write, maintain, or admin permission must add
`cherry-pick:approved` again. Existing generated pull requests are reused or
skipped, so execution creates pull requests only for targets that are still
missing.

The source PR is fixed when the request is first initialized and cannot be
changed. Editing the **Source PR** field makes the request invalid without
changing its recorded source. Restore the original value to continue using the
request, or open a new Cherry-pick request for a different source PR.

### Configuration

The allowed target branches are defined in
[`.github/cherry-pick-config.json`](./.github/cherry-pick-config.json) and must
match the options in
[`.github/ISSUE_TEMPLATE/cherry_pick_request.yml`](./.github/ISSUE_TEMPLATE/cherry_pick_request.yml).
After changing either file, run:

```bash
node .github/scripts/cherry-pick-request.mjs check-config
```

Pull requests that change GitHub Actions workflow files cannot be
automatically cherry-picked with the default `GITHUB_TOKEN`; handle those
backports manually or with a token that explicitly has workflow permission.
