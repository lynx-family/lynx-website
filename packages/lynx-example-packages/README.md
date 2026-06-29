# Lynx Example Packages

This package manages the example dependencies used in the Lynx documentation website. It works in conjunction with the [build script](../../scripts/lynx-example.js) to generate static assets for the `<Go>` component.

## Workflow for Contributors

1.  **Add/Update Dependency**:
    Edit [`package.json`](./package.json) to add or update the example package version (e.g., `"@lynx-example/view": "0.6.4"`).

    > The source code for examples is hosted in the [lynx-examples](https://github.com/lynx-family/lynx-examples) repository.

2.  **Install**:
    Run `pnpm install` in the root directory to download the package into `node_modules`.

3.  **Generate Assets**:
    The website build process automatically runs the generation script. To run it manually:
    ```bash
    node scripts/lynx-example.js
    ```
    This generates metadata and assets in `docs/public/lynx-examples/`.

## Usage in Documentation

Use the `<Go>` component to embed examples in MDX files.

```tsx
import { Go } from '@lynx';

<Go
  example="css"
  defaultFile="src/class_guide/index.tsx"
  defaultEntryFile="dist/class_guide.lynx.bundle"
  highlight="{16}"
  img="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/doc/class-guide.png"
  entry="src/class_guide"
/>;
```

See [Managing Examples](../../docs/en/help/example.mdx) for full documentation.
