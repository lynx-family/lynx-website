# Version resources

The resolver separates URL rules, validated parameters, host defaults, and
presentation. Resource keys follow the URL's addressable operations; each rule
owns its parameter schema. The prefix identifies the repository, while the
suffix names the URL operation: `releases.tag` or `releases.download`.
Keys do not encode versions, platforms, or presentation styles.

Register website resources when URLs need parameters or host version bindings.
Keep fixed URLs, such as the DevTool releases page, as ordinary Markdown links.
The website registry covers Lynx SDK releases and release assets. Its host
adapter reads only `LYNX_VERSION`; source refs and documentation routing remain
independent of these bindings.

## Documentation API

```mdx
import { VersionLink, VersionQRCode, versionResolver } from '@lynx';

export const release = versionResolver.resolve('lynx.releases.tag');

<VersionLink resource="lynx.releases.tag" />

<VersionLink
  resource="lynx.releases.download"
  params={{ asset: 'example.zip' }}
  code
/>

<VersionLink
  resource="lynx.releases.download"
  params={{ asset: 'example.zip' }}
>
  Download
</VersionLink>

<VersionQRCode
  resource="lynx.releases.download"
  params={{ asset: 'example.apk' }}
  size={220}
/>

<VersionLink resource="lynx.releases.tag" params={{ tag: '4.0.3' }}>
  Lynx 4.0.3
</VersionLink>
```

| Resource                 | URL path                           | Parameters     | Default binding           |
| ------------------------ | ---------------------------------- | -------------- | ------------------------- |
| `lynx.releases.tag`      | `/releases/tag/{tag}`              | `tag`          | `LYNX_VERSION`            |
| `lynx.releases.download` | `/releases/download/{tag}/{asset}` | `tag`, `asset` | `tag` from `LYNX_VERSION` |

Parameters are raw, unencoded values. `asset` is a single filename. Release
resources accept Git tag names, such as `4.2.0`, `v3.8.1`, or `sdk/4.2`, and
reject revision expressions such as `HEAD~1`. Commit SHAs are unsupported:
4–64 character hex-only values are rejected, including tag names with the same
shape. This applies to explicit parameters and host bindings. Validation does
not check network availability or guarantee that a release or asset exists.

`resolve(resource, params?)` returns frozen `{ resource, href, params, origins }`.
`params(resource, params?)` performs the same validation without constructing a
URL, for authors who keep the URL inline. `origins` records `binding` or
`explicit` for each effective top-level field.

Explicit values override bindings with a shallow merge. Missing required fields,
unknown fields, and explicit `undefined` values fail. Passing `undefined` as the
whole optional params argument is equivalent to omission. Errors are
`VersionResolutionError` instances with structured `issues`; there is no silent
fallback release or empty URL.

`VersionLink` owns `href` and accepts optional children to override the default
text. Text is plain by default, including filenames and repository paths.
Authors opt into code formatting with `code`, which wraps either the default
text or explicit children in `<code>`. Existing explicit `<code>` children also
work without the prop. Other Link presentation props pass through.

`VersionQRCode` owns `value` and accepts an optional text `label`. Omitted or
blank labels show only the clickable QR. Its default text remains visually
hidden to provide an accessible name.
An explicit nonblank label appears below the QR. The component renders an
inline-block link without a paragraph wrapper; the parent controls surrounding
layout. Size, `className`, and `style` target the SVG. One resolution supplies
both the QR and its enclosing link; the SVG is hidden from assistive technology.
Both components use Rspress's theme `Link`. The QR wrapper suppresses automatic
host and external-link icons because the QR itself is the link's visual content.

For Markdown SSG (`import.meta.env.SSG_MD`), `VersionQRCode` returns only a
text link using the same URL and effective label, without rendering the QR SVG
or its layout markup. `VersionLink` uses the same minimal rendering in both
targets, preserving its text and optional code formatting.

The link text and QR accessible name use these defaults from resolved parameters:

| Resource                 | Default text           |
| ------------------------ | ---------------------- |
| `lynx.releases.tag`      | `GitHub Release {tag}` |
| `lynx.releases.download` | Asset filename         |

Omitted, null, boolean, or blank-text children (including empty arrays) use the
default. Custom JSX children must provide their own readable content or
accessible name. Explicit labels can localize the text. Defaults belong to
presentation and do not introduce schema `.default()` or change resolver parameters.

With the installed Rspress patch, ordinary Markdown paragraphs and inline JSX
work inside `Steps`, `PlatformTabs`, and other MDX containers:

```mdx
Download <VersionLink resource="lynx.releases.download" params={{ asset: 'example.zip' }} code />.
```

The patch also preserves inline JSX in root Markdown lists, tables, emphasis,
blockquotes, and headings. Explicit `<p>` wrappers and JSX text expressions are
not required as an SSG workaround. Keep the patch installed and verify both HTML
and Markdown output when changing these contexts.

Code-fence `{versionJson.X}` replacement remains a separate Rspress concern.
The current HTML build expands those placeholders; Markdown SSG still preserves
them, including in untouched fragments. Resolver-backed links expand in both
formats and do not depend on importing `versionJson` into the document.

## Resource authoring

Resource maintainers work in `registry/`. Each definition contains its `params`
schema, `resolve` URL builder, `bind` host defaults, and `label` display text:

```ts
import { z } from 'zod';

import { defineWebsiteResource } from '../registration';
import { gitTagName, releaseAssetName } from './schemas/github';

export const exampleResources = {
  'example.releases.download': defineWebsiteResource({
    params: z.strictObject({ tag: gitTagName, asset: releaseAssetName }),
    resolve: ({ tag, asset }) =>
      `https://github.com/example-org/example-repo/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(asset)}`,
    bind: () => ({}),
    label: ({ asset }) => asset,
  }),
};
```

An empty binding leaves all required parameters to the caller. For resources
that follow the host SDK, use `bind: ({ LYNX_VERSION }) => ({ tag: LYNX_VERSION })`.
`label` receives the validated effective parameters, including explicit
overrides. All four callbacks/schemas stay beside the resource key; adding a
resource to an existing group does not require changes to the adapter or UI.

Group files by ownership, currently `registry/lynx.ts`. Add a new group to
`createWebsiteRegistry(lynxResources, exampleResources)` in `registry/index.ts`.
Composition rejects duplicate keys; do not merge groups with object spreads
that discard duplicates before registration.

`registry/schemas/github.ts` owns reusable GitHub release parameter schemas.
These validate resource-specific semantics, independent of the generic HTTP(S)
URL check in the resolver. Other providers can own their schemas alongside
their resource definitions.

## Infrastructure boundary

- `core.ts`: pure parameter validation, bindings, immutable resolutions, and
  HTTP(S) URL checks; no website, GitHub, or React dependencies.
- `registration.ts`: the resource authoring interface and group composition;
  derives the core rule table, typed bindings, and label dispatch.
- `registry/`: maintained resource definitions and provider-specific schemas;
  no React or global host configuration imports.
- `website.ts`: pure `createWebsiteVersionResolver(versionData)` adapter that
  connects the registry to the core.
- `components.tsx`: generic `createVersionComponents(resolver, getLabel?)`,
  called at module scope. Factories without a label resolver display the URL.
- `index.ts`: composition with the single host import from `@version-data`.

`index.ts` is the composition point: it passes the host's version data to
`createWebsiteVersionResolver`, then passes that resolver and
`websiteVersionRegistry.label` to `createVersionComponents`. The returned components
capture those dependencies, so documents only provide a resource and its
optional parameters.

The component factory runs once at module scope. This preserves React component
identity across renders; calling it during a render creates new component types.
`Object.freeze({ VersionLink, VersionQRCode })` only prevents replacing fields
on the returned pair. It does not freeze React state, cache resolutions, or keep
component identity stable on its own.

Use Zod 4 object schemas. The core makes the top-level object strict. Nested
objects should also be strict. Schemas validate JSON data without defaults,
coercion, transforms, or asynchronous refinements; parameter-changing parses
are rejected. Bindings are validated field by field during initialization;
cross-field refinements run against complete parameters at resolution time.
Optional binding types do not remove required caller parameters.

Only JSON data is supported. Inputs and bindings are copied, and results are
deeply frozen. Rules and refinements must be synchronous, deterministic, and
free of external mutable state. The resolver snapshots the rule table and
binding data; it cannot freeze state captured by a custom function.

Use the website registration interface to extend this site's resources, or
compose a core resource table and resolver for a standalone consumer. MVP
supports object schemas; source resources, other products' version bindings,
discriminated unions, static MDX analysis, IDE hover, custom protocols, and
remote existence checks remain separate work.

No new resolver alias or package export is introduced. The default components
and instance are public through `@lynx`. A downstream wrapper must forward these
exports, install the updated dependency contract, and bind its own
`@version-data`. Validate both SSG formats with the updated OSS pin downstream.

## Verification

```sh
node --import tsx --test src/components/version-resolver/core.test.ts
pnpm run typecheck
pnpm run lint:react
pnpm run prepare
pnpm run build
```

CI runs the runtime contract cases and includes the compile-only
`types.check.tsx` in the existing whole-site typecheck.
