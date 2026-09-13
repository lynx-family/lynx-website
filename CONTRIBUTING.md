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

```bash
pnpm run format:check
pnpm run build
```

For changes to the Lynx example generator, also run:

```bash
pnpm run test:lynx-example
```

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

For changes under `packages/lynx-compat-data`, also run:

```bash
pnpm --filter @lynx-js/lynx-compat-data run pack:check
```

This verifies that generated CSS property compatibility data is present in the
package tarball without committing `css/properties/*.json` to git.

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

### Portable Documentation Imports

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

// Correct: resolves through the shared OSS/downstream contract.
import { Example } from '@lynx/example';
```

For new imports of shared components, content modules, or assets, choose the
narrowest shared entry points:

| Dependencies used by documentation pages           | Import form         |
| -------------------------------------------------- | ------------------- |
| Components exported by the OSS shared entry point  | `@lynx`             |
| Specific OSS modules under `src/components`        | `@lynx/<module>`    |
| Components exported by the `lynx-ui` shared entry  | `@lynx-ui`          |
| Specific modules under `src/lynx-ui/components`    | `@lynx-ui/<module>` |
| Luna components exported by its exact entry point  | `@luna`             |
| Shared package-document modules                    | `@docs/<path>`      |
| Files under `docs/public/assets`                   | `@assets/<path>`    |
| MDX fragments kept within `docs/` or `sharedDocs/` | Relative imports    |

`@luna` is an exact-match barrel for `src/luna/index.ts`. Use only the bare
alias; `@luna/*` subpaths are not part of the shared resolver contract.

For new imports, omit JS/TS file extensions and a trailing `/index`. Existing
imports that include `/index` remain supported and can be migrated separately.
When replacing a relative import, retain its specific module subpath. Use a
bare entry point only when every consumer exports the imported symbols from
that shared entry point.

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
first matching module. Do not require a downstream consumer to add cross-root
re-exports to make an OSS document compile. If a downstream root overrides an
OSS-owned subpath, the replacement must preserve the module contract used by
shared documentation.

Existing `@/*` imports remain **temporarily** supported for compatibility, but do
not add one for a new OSS documentation component when an `@lynx/*` import is
available. Downstream consumers may resolve `@` through multiple source roots,
where an earlier match shadows later roots.

## Commits

- Follow [Conventional Commits](https://www.conventionalcommits.org/) for
  commit subjects.
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

Keep `TEST` on one line when practical. Use lowercase `issue` and `doc`.

## Pull Requests

- Base normal changes on `main`.
- Format pull request titles as Conventional Commit subjects.
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
5. Wait for validation to mark the request as pending approval.
6. A user with write, maintain, or admin permission must add the
   `cherry-pick:approved` label to start execution.

The workflow creates pull requests only. Generated cherry-pick pull requests
still require the normal review, required checks, CODEOWNERS, and branch
protection process.

If a target conflicts or fails, fix the issue manually or update the request,
then remove and re-add `cherry-pick:approved` to retry. Targets that already
produced a valid generated pull request are skipped on retry.

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
