---
description: 'How pluginLynx and Rspeedy relate, and which one to use for a Lynx project.'
---

# pluginLynx and Rspeedy

A Lynx app is built by [Rsbuild](https://rsbuild.rs/). What makes the output a Lynx bundle instead of a web bundle is **`pluginLynx`**, the Lynx build engine packaged as a set of Rsbuild plugins.

There are two ways to run that engine:

- **Rsbuild with `pluginLynx`** — the recommended setup. You own an ordinary `rsbuild.config.ts` and use the `rsbuild` CLI.
- **Rspeedy** — a wrapper around the same engine, with its own `rspeedy` CLI and `lynx.config.ts`.

Both produce the same `.lynx.bundle`, and the dev server, HMR, QR code and debug metadata behave identically, because all of that lives in `pluginLynx`. What differs is who owns the CLI and how much of the Rsbuild configuration surface you can reach.

## pluginLynx

`pluginLynx` (from [`@lynx-js/rsbuild-plugin`](https://www.npmjs.com/package/@lynx-js/rsbuild-plugin)) is what turns an Rsbuild build into a Lynx build. It configures the dual-thread output and bundle filename, keeps the intermediate files under `dist/.lynx/<entry>/`, tunes minification and source maps for the Lynx runtime, resolves modules through Lynx's `exports` conditions, serves the bundle over your LAN during development, and registers the debug metadata used to [map production errors to source](./map-errors-to-source.mdx).

You rarely apply it by hand: [`pluginReactLynx`](https://www.npmjs.com/package/@lynx-js/react-rsbuild-plugin) applies it for you when it is not already registered, which is why the ReactLynx template lists only `pluginReactLynx`.

```ts title="rsbuild.config.ts"
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  environments: {
    lynx: {},
  },
  source: {
    entry: {
      main: './src/index.tsx',
    },
  },
  plugins: [pluginReactLynx()],
});
```

Three things to know:

- **The `lynx` environment.** Rsbuild's default environment is `web`. `pluginLynx` fills in `environments: { lynx: {} }` when your config declares none, so the example above spells it out only to stay explicit. Declare it yourself when your config declares any other environment, or when you are on `@lynx-js/rsbuild-plugin@0.1.2` or older, where that default is not in place yet and the build quietly emits a web-encoded bundle.
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
- Lynx-oriented defaults that plain Rsbuild does not set, such as a default entry, code splitting off, inlined scripts and no polyfills

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

The trade-off is reach: Rspeedy's config is a curated subset of Rsbuild's, so options like `html`, `security`, `moduleFederation`, `tools.postcss` or `tools.sass` are rejected rather than passed through, and a few values such as `output.charset` and `output.polyfill` are fixed. In exchange, `source.entry` also accepts a plain string and `output.filename` a plain string.

Its type declarations re-export Rsbuild's:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "types": ["@lynx-js/rspeedy/client"]
  }
}
```

See the [Rspeedy documentation](https://lynx-stack.dev/guide/cli) for its CLI and options.

## Which one to use

Use **Rsbuild with `pluginLynx`** for new projects. It is what `create-lynx` recommends, it keeps you on the config and CLI the Rstack ecosystem documents, and the whole Rsbuild configuration surface and plugin catalog stays available.

Rspeedy remains supported. It is the right choice when existing tooling depends on the `rspeedy` CLI or on `lynx.config.ts`, or when you want its stricter config validation and ready-made defaults.

```bash
npm create @lynx-js/lynx@latest
```

The command asks which build tool to use — Rsbuild with `pluginLynx` (recommended), Rspeedy, or Rslib for a component library.
