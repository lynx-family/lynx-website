# Lynxtron Example Packages

Aggregates `@lynxtron-examples/*` packages from npm so the documentation site can render them via the `<Go>` component.

Sibling of [`lynx-example-packages/`](../lynx-example-packages) and [`lynx-ui-example-packages/`](../lynx-ui-example-packages); the workflow and build script (`scripts/lynx-example.js`) are shared.

## Workflow for Contributors

1. **Add/Update Dependency**:
   Edit [`package.json`](./package.json) to add or update the example package version (e.g., `"@lynxtron-examples/file-explorer": "0.0.2"`).

   > The source code for examples is hosted in the [lynxtron-examples](https://github.com/lynx-community/lynxtron-examples) repository.

2. **Install**:
   Run `pnpm install` in the root directory to download the package into `node_modules`.

3. **Generate Assets**:
   The website build process automatically runs the generation script. To run it manually:

   ```bash
   pnpm prepare:lynxtron-example-data
   ```

   This appends metadata and assets to `docs/public/lynx-examples/` (shared namespace with the other example packages, keyed by directory name).

## Usage in Documentation

`nativeFramework` is injected into `example-metadata.json` automatically by the
build script (via the `NATIVE_FRAMEWORK=lynxtron` env var), so you don't need to
repeat it on every `<Go>` call.

```tsx
import { Go } from '@lynx';

<Go
  example="todolist"
  defaultFile="src/app/App.tsx"
  deepLinkUrl="lynxtron-go://showcase/open?id=%40lynxtron-examples%2Ftodolist"
  webPreview={false}
/>;
```
