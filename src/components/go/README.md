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
   You need to prepare an example package in advance and generate example data. For detailed guidance, please refer to[lynx-example-packages](./../../packages/lynx-example-packages/README.md)

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

```jsx
interface Props {
  /**
   * example name
   *
   * @example
   * example="view"
   */
  example: string;
  /**
   * default file to display
   *
   * @example
   * defaultFile="src/App.tsx"
   */
  defaultFile: string;
  /**
   * example screenshot, if not provided, the default is example/preview-image.png, supports multiple formats /^preview-image\.(png|jpg|jpeg|webp|gif)$/
   *
   * @example
   * img="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/doc/view_render.jpeg"
   */
  img?: string;
  /**
   * default entry file, if not provided, the default is example/**.lynx.bundle
   *
   * @example
   * defaultEntryFile="dist/main.lynx.bundle"
   */
  defaultEntryFile?: string;
  /**
   * highlight lines of code, only effective for defaultFile
   *
   * @example
   * highlight={{
   *   "src/waterfall/index.tsx": "{1,3-5}",
   *   "src/waterfall/App.tsx": "{1,3-5}",
   * }}
   */
  highlight?: string | Record<string,string>;
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
}
```

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

### Entry File

To specify a default entry file, use the following:

```jsx
<Go
  example="animation"
  defaultFile="src/transition_animation/index.tsx"
  defaultEntryFile="dist/transition_animation.lynx.bundle"
/>
```

This example specifies `dist/transition_animation.lynx.bundle` as the default entry file.

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
  defaultEntryFile="dist/transition_animation.lynx.bundle"
  entry="src/transition_animation"
  schema="{{{url}}}?bar_color=000000&back_button_style=dark"
/>
```
