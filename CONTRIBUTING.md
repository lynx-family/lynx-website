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

For changes under `packages/lynx-compat-data`, also run:

```bash
pnpm --filter @lynx-js/lynx-compat-data run pack:check
```

This verifies that generated CSS property compatibility data is present in the
package tarball without committing `css/properties/*.json` to git.

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

## Release Cherry-picks

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
