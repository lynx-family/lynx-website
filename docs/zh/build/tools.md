---
description: 'pluginLynx 与 Rspeedy 的关系，以及项目该选哪一个。'
---

# pluginLynx 与 Rspeedy

Lynx 应用由 [Rsbuild](https://rsbuild.rs/) 构建。让产物成为 Lynx Bundle 而不是 Web Bundle 的，是 **`pluginLynx`**——以一组 Rsbuild 插件形式提供的 Lynx 构建引擎。

运行这套引擎有两种方式：

- **Rsbuild + `pluginLynx`**：推荐方式。你维护一份普通的 `rsbuild.config.ts`，用 `rsbuild` 命令行。
- **Rspeedy**：同一套引擎的封装，提供自己的 `rspeedy` 命令行和 `lynx.config.ts`。

```bash
# Rsbuild + pluginLynx（推荐）
npm create @lynx-js/lynx@latest -- --template rsbuild-react-ts

# Rspeedy
npm create @lynx-js/lynx@latest -- --template rspeedy-react-ts
```

两者产出的 `.lynx.bundle` 完全相同，dev server、HMR、二维码、debug metadata 的行为也一致——这些都在 `pluginLynx` 里。区别在于命令行由谁提供，以及你能触及多少 Rsbuild 的配置能力。

## pluginLynx

`pluginLynx`（来自 [`@lynx-js/rsbuild-plugin`](https://www.npmjs.com/package/@lynx-js/rsbuild-plugin)）是把一次 Rsbuild 构建变成 Lynx 构建的关键。它配置双线程产物与 Bundle 文件名，把中间产物保留在 `dist/.lynx/<entry>/`，按 Lynx 运行时调整压缩与 source map，按 Lynx 的 `exports` 条件解析模块，在开发时通过局域网把产物推送到设备，并注册[线上错误反解](./map-errors-to-source.mdx)所需的 debug metadata。

你很少需要手动引入它：[`pluginReactLynx`](https://www.npmjs.com/package/@lynx-js/react-rsbuild-plugin) 在它尚未注册时会自动应用，所以 ReactLynx 模板的配置里只写了 `pluginReactLynx`。

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

两点需要注意：

- **`source.entry` 用对象形式**，和其他 Rsbuild 项目一致。
- **需要配置选项时要自己引入 `pluginLynx`。** 自动应用用的是默认选项，所以想配 `output.filename.bundle` 或 `performance.profile`，需要在 `plugins` 里显式写上 `pluginLynx({ ... })`，不会重复应用。

类型声明来自 Rsbuild：

```json title="tsconfig.json"
{
  "compilerOptions": {
    "types": ["@rsbuild/core/types"]
  }
}
```

## Rspeedy

Rspeedy（[`@lynx-js/rspeedy`](https://www.npmjs.com/package/@lynx-js/rspeedy)）封装了同一套引擎，并额外提供：

- `rspeedy` 命令行：`dev`、`build`、`preview`、`inspect`，配置文件变更时会自动重启
- 以 `lynx.config.ts` 作为配置文件，`defineConfig` 来自 `@lynx-js/rspeedy`
- 对配置的严格校验：写错的键会直接报错，而不是被静默忽略

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

代价是能力范围：Rspeedy 的配置是 Rsbuild 配置的一个精选子集，`html`、`security`、`moduleFederation`、`tools.postcss`、`tools.sass` 这类选项会被拒绝而不是透传，`output.charset`、`output.polyfill` 等少数值是固定的。作为交换，它的 `source.entry` 也接受字符串，`output.filename` 也接受字符串。

它的类型声明是对 Rsbuild 类型的再导出：

```json title="tsconfig.json"
{
  "compilerOptions": {
    "types": ["@lynx-js/rspeedy/client"]
  }
}
```

命令行与配置项详见 [Rspeedy 文档](https://lynx-stack.dev/zh/guide/cli)。

## 该用哪个

新项目用 **Rsbuild + `pluginLynx`**。这是 `create-lynx` 推荐的方式，配置和命令行都与 Rstack 生态的文档一致，Rsbuild 的完整配置能力和插件生态都可以直接使用。

Rspeedy 仍在维护。如果现有工具链依赖 `rspeedy` 命令行或 `lynx.config.ts`，或者你需要它更严格的配置校验，继续用它没有问题。

不带 `--template` 执行 `npm create @lynx-js/lynx@latest` 会让你选择构建工具，也提供用于组件库的 Rslib。
