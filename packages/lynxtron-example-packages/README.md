# Lynxtron documentation examples

This directory owns examples published by `lynx-community/lynxtron-examples`.
Do not add these packages to `lynx-example-packages`: that directory belongs to
the `lynx-family/lynx-examples` publishing and downstream conversion flow.

From the website workspace root, install the frozen lockfile and run
`pnpm prepare:lynxtron-example-data`. The generator reads this directory's
`node_modules/@lynxtron-examples` and adds source files, precompiled bundles and
metadata to `docs/public/lynx-examples`. Run the generic example generator first,
because it clears the shared output directory. Go deep links continue to use the
upstream `@lynxtron-examples/*` showcase identifiers.

Downstream builds that include Lynxtron pages must explicitly provide these
packages and run this separate generation step. Converting packages from
`lynx-family/lynx-examples` does not supply Lynxtron examples. Preserve the example
directory names, source files, precompiled Web assets and metadata consumed by
the documentation when providing a downstream package source.

## Current archive limitation

The pinned Native Texture archive contains a relative `file:` dependency on its
native extension. The website only consumes source and precompiled files, so
the root workspace override skips that dependency. Moving the example into this
directory does **not** fix the archive's independent installation: copying this
directory and running `pnpm install --ignore-workspace` without that override is
not yet supported. The upstream archive must become independently installable
before dropping the override or claiming isolated downstream installation works.

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
