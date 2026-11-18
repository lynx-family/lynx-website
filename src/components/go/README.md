# `<Go>`

The <Go> component provides a versatile and interactive approach to showcase code examples within the Lynx documentation.

## Features

- Generate code examples derived from the original lynx-examples codebase.
- Support for screenshot previews of examples.
- Enable product QR code previews.
- Facilitate code line highlighting for enhanced readability.
- Allow toggling between full file tree displays.
- Provide navigation to the source code of examples.

## Usage

To utilize the <Go> component in your documentation, follow these steps:

1. prepare the example package
   You need to prepare an example package in advance and generate example data. For detailed guidance, please refer to [lynx-example-packages](./../../packages/lynx-example-packages/README.md)

   Running pnpm install in the root directory to install dependencies will automatically generate the example data.

2. Import the component:

   ```jsx
   import { Go } from '@lynx';
   ```

3. Use it in your MDX files:

   ```jsx
   <Go example="animation" defaultFile="src/transition_animation/index.tsx" />
   ```

## Props

The `<Go>` component accepts the following props:

```tsx
interface Props {
  /**
   * example name
   *
   * @example
   * example="view"
   */
  example: string;
  /**
   * initial source file to display; defaults to 'package.json'
   *
   * @example
   * defaultFile="src/App.tsx"
   */
  defaultFile?: string;
  /**
   * example screenshot, if not provided, the default is example/preview-image.png, supports multiple formats /^preview-image\.(png|jpg|jpeg|webp|gif)$/
   *
   * @example
   * img="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/doc/view_render.jpeg"
   */
  img?: string;
  /**
   * exact logical entry name from example-metadata.json templateFiles[].name
   * recommended when selecting among multiple entries
   *
   * @example
   * defaultEntryName="main"
   */
  defaultEntryName?: string;
  /**
   * highlight lines of code, only effective for defaultFile
   *
   * @example
   * highlight={{
   *   "src/waterfall/index.tsx": "{1,3-5}",
   *   "src/waterfall/App.tsx": "{1,3-5}",
   * }}
   */
  highlight?: string | Record<string, string>;
  /**
   * entry component directory, for example: src/waterfall, will show waterfall App.tsx/index.tsx tabs
   *
   * @example
   * entry="src/waterfall"
   */
  entry?: string;
  /**
   * schema for the example, will be used to generate the QR code of the example
   *
   * @example
   * schema="{{{url}}}?bar_color=000000&back_button_style=dark"
   */
  schema?: string;
  /**
   * Override the default preview tab for this instance.
   *
   * - 'preview' — static screenshot (requires img)
   * - 'web'     — live web preview (requires webFile in metadata)
   * - 'qrcode'  — QR code for Lynx Explorer
   *
   * Resolution order: instance prop > GoConfigProvider > fallback.
   * Fallback is 'preview' if img is available, otherwise 'qrcode'.
   *
   * @example
   * defaultTab="web"
   */
  defaultTab?: 'preview' | 'web' | 'qrcode';
  /**
   * Caller-owned guidance below Copy link and above the QR entry selector.
   * Strings receive the default text callout; React nodes retain their styling.
   * Only appears in the QR tab and does not change host compatibility.
   */
  qrcodeNote?: React.ReactNode;
  /**
   * Preview app name shown in QR code scanning instructions.
   * Only shown for universal bundles without nativeFramework.
   * Falls back to LYNX_EXPLORER_TEXT, then 'Lynx Explorer'.
   */
  explorerText?: string;
  /**
   * Preview app links shown in QR code scanning instructions.
   * Only shown for universal bundles without nativeFramework.
   * Each omitted language falls back to its LYNX_EXPLORER_URL_CN/EN value,
   * then the site's quick-start download link.
   */
  explorerUrl?: { cn?: string; en?: string };
}
```

## Scan Instructions

Use `explorerText` and `explorerUrl` to select a preview app for an example:

```tsx
<Go
  example="hello-world"
  defaultTab="qrcode"
  explorerText="Custom Preview App"
  explorerUrl={{ en: '/preview-app', cn: '/zh/preview-app' }}
/>
```

The exported `GoProps` type includes both overrides. Each field resolves
independently: instance prop, then its `LYNX_EXPLORER_*` environment value,
then the existing site default. `explorerUrl` can contain just `en` or `cn`;
the omitted language keeps its current link. Only site-root paths (`/...`,
excluding `//...`) use the Rspress adapter's `withBase`, including archived
deployments. Absolute URLs, protocol-relative URLs, relative paths, fragments,
and schemes pass through unchanged.

The website wrapper creates its own `GoConfigProvider`, so an outer provider
does not override its configuration. Set these props directly on `<Go>`.
These overrides change the scan instructions. For universal bundles,
`schema` or the selected `schemaOptions` template determines the QR URL;
without either, the QR code uses the entry URL. `deepLinkUrl` changes only
the separate open-in link. For native-framework examples with a QR panel,
the QR code uses the resolved deep link.

The scan hint appears only for universal bundles without `nativeFramework`.
Native-framework examples can have a QR panel without that hint. Use
`qrcodeNote` for additional guidance when the QR panel is available.

## QR Code Notes

Pass `qrcodeNote` to explain host requirements or preview limits:

```tsx
<Go
  example="hello-world"
  defaultTab="qrcode"
  qrcodeNote="Changing the schema does not change binary compatibility."
/>
```

The prop accepts a string or a React node. Strings receive a themed 11px
callout; React nodes keep caller-owned styling. Omit it, or pass `null`,
`false`, or an empty string, to add no note. The wrapper forwards it through
`...props`; source-only SSG output does not include QR-panel notes.

## Default Tab Configuration

The default preview tab can be configured at these levels (highest priority first):

1. **Instance-level** — `defaultTab` prop on `<Go>`:

   ```jsx
   <Go example="hello-world" defaultFile="src/App.tsx" defaultTab="web" />
   ```

2. **Site-level** — `defaultTab` in the website wrapper's own `GoConfigProvider`:

   ```tsx
   // site-wide (e.g. in Go.tsx wrapper)
   const config = { exampleBasePath: '/lynx-examples', defaultTab: 'web' };
   ```

3. **Fallback** — `'preview'` if an image is available, otherwise `'qrcode'`.

For a page, pass `defaultTab` to each `<Go>` instance. An outer provider is
shadowed by the website wrapper's own provider.

## Examples

### Preview Image

To include a preview image, use the following:

```jsx
<Go
  example="animation"
  defaultFile="src/transition_animation/index.tsx"
  img="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/bg-draggable.gif"
/>
```

The above code demonstrates an animation example with the preview image `https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/bg-draggable.gif`. If the img prop is not provide，it will default to using `example/preview-image.png` `(matches /^preview-image\.(png|jpg|jpeg|webp|gif)$/)` as the preview image.

### Entry Name

To select a default metadata entry, use the following:

```jsx
<Go
  example="animation"
  defaultFile="src/transition_animation/index.tsx"
  defaultEntryName="transition_animation"
/>
```

The metadata generator derives this logical name from the Lynx bundle basename.
For example, `dist/transition_animation.lynx.bundle` produces the entry name
`transition_animation`. The prop selects `templateFiles[].name` exactly without
depending on the generated artifact filename.

When the prop is omitted, go-web falls back to `templateFiles[0]`. That position
has no declared default semantics and is not explicitly sorted by the generator.
Only omit the prop for a single-entry example. An unknown name does not fall back
to the first entry.

### Highlighting Lines

To highlight specific lines of code, use the following:

```jsx
<Go
  example="animation"
  defaultFile="src/transition_animation/index.tsx"
  highlight="{1,3-5}"
/>
```

The above code will highlight the first line and the third to fifth lines of the `src/transition_animation/index.tsx` file.

### Entry Component

To use an entry component, use the following:

```jsx
<Go
  example="animation"
  defaultFile="src/transition_animation/index.tsx"
  highlight="{1,3-5}"
  entry="src/transition_animation"
/>
```

### Full Example

Here’s a complete example of the `<Go>` component in use:

```jsx
<Go
  example="animation"
  img="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/bg-draggable.gif"
  defaultFile="src/transition_animation/index.tsx"
  highlight="{1,3-5}"
  defaultEntryName="transition_animation"
  entry="src/transition_animation"
  schema="{{{url}}}?bar_color=000000&back_button_style=dark"
/>
```
