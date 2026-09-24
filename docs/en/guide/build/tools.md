---
description: 'How pluginLynx and Rspeedy relate, and which one to use for a Lynx project.'
---

# Rsbuild and Rspeedy

A Lynx app is built by [Rsbuild](https://rsbuild.rs/). What makes the output a Lynx bundle instead of a web bundle is **`pluginLynx`**, the Lynx build engine packaged as a set of Rsbuild plugins.

There are two ways to run that engine:

- **Rsbuild with `pluginLynx`** — the recommended setup. You own an ordinary `rsbuild.config.ts` and use the `rsbuild` CLI.
- **Rspeedy** — a wrapper around the same engine, with its own `rspeedy` CLI and `lynx.config.ts`.

```bash
# Rsbuild with pluginLynx (recommended)
npm create @lynx-js/lynx@latest -- --template rsbuild-react-ts

# Rspeedy
npm create @lynx-js/lynx@latest -- --template rspeedy-react-ts
```

Both produce the same `.lynx.bundle`, and the dev server, HMR, QR code and debug metadata behave identically, because all of that lives in `pluginLynx`. What differs is who owns the CLI and how much of the Rsbuild configuration surface you can reach.

The output itself differs from a web build in several ways: no HTML entry, styles and scripts encoded into one binary, and one copy of your code per thread. [What is a Lynx Bundle?](./lynx-bundle.md) covers that, and makes the configuration below easier to follow.

## Rsbuild with pluginLynx

`pluginLynx` (from [`@lynx-js/rsbuild-plugin`](https://www.npmjs.com/package/@lynx-js/rsbuild-plugin)) is what turns an Rsbuild build into a Lynx build. It configures the dual-thread output and bundle filename, keeps the intermediate files under `dist/.lynx/<entry>/`, tunes minification and source maps for the Lynx runtime, resolves modules through Lynx's `exports` conditions, serves the bundle over your LAN during development, and registers the debug metadata used to [map production errors to source](/guide/devtool/map-errors-to-source.mdx).

You rarely apply it by hand: [`pluginReactLynx`](https://www.npmjs.com/package/@lynx-js/react-rsbuild-plugin) applies it for you when it is not already registered, which is why the ReactLynx template lists only `pluginReactLynx`.

```ts title="rsbuild.config.ts"
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  source: {
    entry: {
      main: './src/index.tsx',
    },
  },
  plugins: [pluginReactLynx()],
});
```

Two things to know:

- **`source.entry` takes the object form**, like any other Rsbuild project.
- **Apply `pluginLynx` yourself when you need its options.** The automatic application uses default options, so configuring `output.filename.bundle` or `performance.profile` means adding `pluginLynx({ ... })` to `plugins` explicitly. It is not applied twice.

Types come from Rsbuild:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "types": ["@rsbuild/core/types"]
  }
}
```

## Rspeedy

Rspeedy ([`@lynx-js/rspeedy`](https://www.npmjs.com/package/@lynx-js/rspeedy)) wraps the same engine and adds:

- the `rspeedy` CLI — `dev`, `build`, `preview` and `inspect` — which also restarts itself when the config file changes
- `lynx.config.ts` as the config file, with `defineConfig` from `@lynx-js/rspeedy`
- strict validation of that config: an unknown key is an error, not a silent no-op

```ts title="lynx.config.ts"
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { defineConfig } from '@lynx-js/rspeedy';

export default defineConfig({
  source: {
    entry: './src/index.tsx',
  },
  plugins: [pluginReactLynx()],
});
```

The trade-off is reach: Rspeedy's config is a curated subset of Rsbuild's, so options like `tools.postcss` and `tools.sass` are rejected rather than passed through, and a few values such as `output.charset` and `output.polyfill` are fixed. What it gains is that Lynx's own options sit in the config itself: `output.filename.bundle` and `performance.profile` need no detour through `pluginLynx`. `source.entry` and `output.filename` additionally accept a plain string.

Its type declarations re-export Rsbuild's:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "types": ["@lynx-js/build/client"]
  }
}
```

See the [Rspeedy documentation](https://lynx-stack.dev/guide/cli) for its CLI and options.

## Which one to use

Use **Rsbuild with `pluginLynx`** for new projects. It is what [`@lynx-js/create-lynx`](https://www.npmjs.com/package/@lynx-js/create-lynx) recommends, it keeps you on the config and CLI the Rstack ecosystem documents, and the whole Rsbuild configuration surface and plugin catalog stays available.

Rspeedy remains supported. It is the right choice when existing tooling depends on the `rspeedy` CLI or on `lynx.config.ts`, or when you want its stricter config validation.

Running `npm create @lynx-js/lynx@latest` without `--template` asks which build tool to use, and also offers Rslib for a component library.

## Migrating an Rspeedy project

Rspeedy and `pluginLynx` share one engine, so the move is a config change, not a rewrite. Nothing about the output changes.

1. Replace the dependency: drop `@lynx-js/rspeedy`, add [`@rsbuild/core`](https://www.npmjs.com/package/@rsbuild/core).
2. Point the scripts at the other CLI — `rspeedy dev`, `rspeedy build` and `rspeedy preview` become `rsbuild dev`, `rsbuild build` and `rsbuild preview`.
3. Rename `lynx.config.ts` to `rsbuild.config.ts` and take `defineConfig` from `@rsbuild/core` instead of `@lynx-js/rspeedy`.
4. Switch `types` in `tsconfig.json` from `@lynx-js/rspeedy/client` to `@rsbuild/core/types`.

Then adjust the config itself:

- **`source.entry` and `output.filename` take the object form.** Rspeedy also accepts a plain string; Rsbuild does not.
- **Lynx's own options move into `pluginLynx`.** `output.filename.bundle` and `performance.profile` are Rspeedy config keys, not Rsbuild ones, so they belong in `pluginLynx({ ... })` — which also means applying that plugin explicitly, since the automatic application uses default options.

The option this opens up in practice is `tools.postcss`, which Rspeedy does not accept.
