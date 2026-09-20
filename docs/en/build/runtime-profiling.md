# Runtime Profiling

## Profiling Lynx

Following the instruction of [Record Trace](/guide/devtool/trace/record-trace.html) to profiling Lynx.

## Profiling Framework

You can analyze framework performance in two ways: via build configuration and using the [JS Profile](/guide/devtool/trace/js-profile.html).

### Enabling via Build Configuration

We provide the builtin trace points in frameworks like ReactLynx (Components' `render` and `diff`).

![react profile](https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/plugin/static/rspeedy-react-profile.png)

- In development(`npx rsbuild dev`): ReactLynx-related trace points are _**added**_ by default.
- In production(`npx rsbuild build`): ReactLynx-related trace points are _**removed**_ by default.

These tracing points show how components are rendered and diffed.

#### Run profiling in production

The trace points can be enabled by setting the `performance.profile` to `true` when build.

```js
import { pluginLynx } from '@lynx-js/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  plugins: [
    pluginLynx({
      performance: {
        profile: true, // [!code ++]
      }, // [!code ++]
    }), // [!code ++]
  ],
});
```

:::tip
You may use [`npx rsbuild preview`](https://rsbuild.rs/guide/basic/cli#rsbuild-preview) to preview the output locally.
:::

This is useful when trying to optimize the performance of the application.

:::warning
Do **NOT** deploy the output with `performance.profile: true`. They are not for production.
:::

#### Disable profiling in development

The trace points can be disabled by setting the `performance.profile` to `false` when dev.

```js
import { pluginLynx } from '@lynx-js/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  plugins: [
    pluginLynx({
      performance: {
        profile: false, // [!code ++]
      }, // [!code ++]
    }), // [!code ++]
  ],
});
```

### Dynamic Sampling with JS Profile

Use the [JS Profile](/guide/devtool/trace/js-profile.html) tool to collect call stack data at runtime without modifying the build configuration.
