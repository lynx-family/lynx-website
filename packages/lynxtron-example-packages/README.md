# Lynxtron documentation examples

This directory owns examples published by `lynx-community/lynxtron-examples`.
Do not add these packages to `lynx-example-packages`: that directory belongs to
the `lynx-family/lynx-examples` publishing and downstream conversion flow.

From the website workspace root, install the frozen lockfile and run
`pnpm prepare:lynxtron-example-data` (`node scripts/lynxtron-examples.js`).
This dedicated entry configures the shared generator and reads this directory's
`node_modules/@lynxtron-examples` and adds source files, precompiled bundles and
metadata to `docs/public/lynx-examples`. Run the generic example generator first,
because it clears the shared output directory. Go deep links continue to use the
upstream `@lynxtron-examples/*` showcase identifiers.

Downstream builds that include Lynxtron pages must explicitly provide these
packages and run this separate generation step. Converting packages from
`lynx-family/lynx-examples` does not supply Lynxtron examples. Preserve the example
directory names, source files, precompiled Web assets and metadata consumed by
the documentation when providing a downstream package source.

The Lynxtron entry owns the Web-host allowlist, keyed by full package name
(for example, `@lynxtron-examples/cross-platform-notes`). The shared generator
does not enable these iframe previews on its own. Downstream builds must invoke
the dedicated entry and preserve these package names. `EXAMPLES_DIR` and
`LINK_PATH` may override the input and output directories; existing output is
preserved. Validate downstream adaptation against the final exact website
commit before merging, not just a local OSS build.

## Independent installation

The pinned Go 0.1.18 release archives bundle local runtime dependencies, including
the Native Texture extension, while preserving their editable source files.
No root workspace override is needed. Downstream source-only consumers can copy
this directory's `package.json` into an empty directory and run
`pnpm install --ignore-workspace --ignore-scripts`. Install scripts are unnecessary
for generating documentation from the source and precompiled files.

## Usage in documentation

`nativeFramework` is injected into `example-metadata.json` by the generator.
Use the package's unscoped name as the example directory:

```tsx
import { Go } from '@lynx';

<Go
  example="todolist"
  defaultFile="src/app/App.tsx"
  deepLinkUrl="lynxtron-go://showcase/open?id=%40lynxtron-examples%2Ftodolist"
  webPreview={false}
/>;
```

Run `node --test scripts/lynxtron-example-pipeline.test.cjs` from the workspace
root to check source ownership, blog references and Web-host metadata generation.
