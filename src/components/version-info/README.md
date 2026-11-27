# SDK Version Information

Internal guidance for the section-level [Since component](./Since.tsx),
[page component](../../../theme/versioning/PageSdkSince.tsx), and
[build plugin](../../../scripts/build/plugin-sdk-since.ts).

[Shared SDK rules](../../versioning/sdk-since.ts) own version parsing,
comparison, release-state resolution, baseline visibility, and page eligibility.
The build plugin, `useSdkSince`, and page component import these pure functions.
This module has no React, Rspress, or filesystem dependencies. The build plugin
owns document reading and route validation; the hook owns site settings and
localized copy; the components own rendering and interaction.

## Rendering Ownership

Page and section requirements have separate HTML and SSG Markdown entry
points. `Since.tsx` owns local grouping and authored children.
`theme/versioning/PageSdkSince.tsx` owns page eligibility and
page-level Markdown. Neither renderer delegates to the other, so their presentation and Markdown can evolve
independently.

Both use the private `useSdkSince` hook for site settings, version facts,
release copy, and baseline visibility. `SinceIndicator.tsx` shares only the
HTML capsule and its accessible release-details interaction.
Tailwind utilities own geometry and transitions; each renderer sets
`--sdk-since-icon-color`, `--sdk-since-background`, and
`--sdk-since-hover-background` on its own container. The indicator's private
`className`, `capsuleClassName`, and `iconClassName` props target the container,
capsule, and icon slot respectively. The icon slot accepts `--icon-size`;
the Note variant uses it to enlarge the glyph without targeting internal
selectors. Collapsible animations and their reduced-motion rules live in
`SinceIndicator.module.css`, scoped to the indicator.

The public `@lynx` API exports only `Since` and `SinceProps`. Page rendering
belongs to the theme; authors declare frontmatter rather than selecting a
page variant of the local component.

## Page-level SDK Versions

New handwritten guide pages with one SDK version requirement can declare it
in frontmatter:

```yaml
---
since: '4.3'
---
```

`since` is the minimum Lynx SDK version for the capability or usage described
by the whole page, not its creation or last-updated version. Use a quoted
`x.y` string; numeric values, patch versions, and `next` are not accepted.
Keep existing English/Chinese counterparts consistent. No declaration means
no support assertion.

The theme displays a small capsule before the document's H1 through
`Layout.beforeDocContent`. With release status enabled, if `since` is at or
below the site's `latestStable`, it shows `Lynx x.y+` with the L icon. Unreleased versions
show the same version label with the L star icon in an expandable capsule.
Hovering or focusing it shows an `Unreleased` tooltip, which is hidden while
expanded. Expanding it shows the unreleased status, latest stable version,
and a link to
[Lynx releases](https://github.com/lynx-family/lynx/releases).
Unreleased means not yet included in a stable SDK
release; it does not promise a Nightly or beta/RC artifact or imply
Experimental API stability.

Only `docs/{en,zh}/guide` document routes participate. Imported fragments,
synced/generated references, and other product version axes are outside this
contract. Do not duplicate API compatibility data, infer platform support, or
apply one version to a page whose instructions require different versions.
Retain explicit platform and local version restrictions in the body.

## Local SDK Requirements

Import `Since` from the public `@lynx` barrel for requirements that apply to a
section, method, or individual capability:

```mdx
import { Since } from '@lynx';

<Since since="3.4" />

<Since since="4.5">

Heap snapshot collection currently supports QuickJS only.

</Since>
```

Place the compact form below the affected heading. With children, `Since`
renders a Note-style block whose title is the version requirement. Local
indicators use a brand-colored icon; the page component owns its neutral
chrome. Only the unreleased explanation collapses, never the
authored content.

Both forms read `latestStable` and `baseline` from `themeConfig.sdkVersioning`.
Explicit props override these two site values independently. The site-wide
`showReleaseStatus` setting cannot be overridden by component props.
Without site configuration, the release JSON supplies `latestStable` and no
baseline is applied.
The HTML baseline hides only the indicator; children retain their content
block. Markdown always preserves version facts and groups the version, release
status, and children in one blockquote. Without children it emits plain paragraphs.

Keep English and Chinese declarations and restrictions consistent. Scope
requirements to verified capabilities; an optional newer feature does not raise
the whole page's minimum. Keep engine, platform, and DevTool restrictions in the
body. Use a regular Note for usage changes across versions or for other products'
version axes, such as React or ReactLynx packages.

## Site Configuration

Each site supplies global SDK settings as the second argument to
`pluginPageSdkSince` in its Rspress configuration:

```ts
pluginPageSdkSince(docsRoot, {
  latestStable: '4.2',
  baseline: '3.2',
  showReleaseStatus: true,
});
```

The plugin shares these settings with the theme through
`themeConfig.sdkVersioning` and uses the same `latestStable` for validation.
Both versions must be quoted `x.y` strings, and `baseline` must not exceed
`latestStable`. Omitting `baseline` displays every annotated version.

The OSS site reads `latestStable` from
[lynx-sdk-release.json](../../versioning/lynx-sdk-release.json) and explicitly
sets `baseline: '3.2'` in [rspress.config.ts](../../../rspress.config.ts).
Downstream sites must supply their own settings; they do not inherit the OSS
baseline. The existing one-argument plugin call retains the release JSON default
without hiding any capsules.

`showReleaseStatus` defaults to `true`. Setting it to `false` keeps `Lynx x.y+`
and authored content, but removes the star, Unreleased tooltip, expansion, and
release explanation from both page and local indicators. Exported Markdown
also omits release status while retaining the SDK version. Baseline hiding
and metadata validation still apply. Configure it through the plugin only;
do not duplicate these settings in `themeConfig`.

The canonical site maintains `latestStable` with release status enabled. If
the transitional `release/4.3` site is created, set `showReleaseStatus: false`
in that branch's Rspress configuration. It then displays minimum SDK
requirements without needing ongoing release-state updates. Release 4.2 and
older do not have this feature and need no changes. This switch requires no
network lookup, branch detection, or synchronization between branches.

Capsules with `since <= baseline` are omitted entirely, including their
spacing. Keep the frontmatter fact: exported Markdown still includes the
version statement, and unannotated pages remain unspecified. The baseline
is a display threshold, not an assertion that older SDKs are unsupported,
and should not advance automatically with each release.

After an SDK minor or major release becomes stable, update the site's `latestStable`
and rebuild. Page declarations stay unchanged. This metadata is independent
of the existing website version menu and installation dependency versions.

This feature does not change deployment or release-branch policy. Making
`main` the default documentation entry and ending routine release-site
branching first requires validated scoped snapshots for historical content,
including necessary dependency, example, and artifact bindings, and a
version-retention strategy for synced/generated documentation.

## Verification

Builds validate the metadata and locale parity using Rspress's actual routes.
For changes to rendering, the version resolver, or validation, run from the
repository root:

```bash
node --import tsx --test scripts/build/page-sdk-since.test.ts
node --experimental-vm-modules --test scripts/since-rendering.test.mjs scripts/theme-before-doc-content.test.mjs
```

Shared runtime and configuration changes also require `pnpm run prepare` and
`pnpm run build`, followed by downstream validation against the updated OSS pin.
