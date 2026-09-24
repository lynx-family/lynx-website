# 构建输出文件

本章将介绍输出文件的目录结构以及如何控制不同类型文件的输出路径。

## 默认目录结构

以下是基本的输出目录结构。默认情况下，编译后的文件会输出到当前项目的 `dist` 目录中。

### 生产环境

生产环境下，`dist/` 目录包含所有需要部署的文件。

```txt
dist/
├── [name].lynx.bundle
├── lazy-bundle
│   └── [name].[hash].bundle
└── static
    ├── image
    │   └── [name].[hash].png
    ├── svg
    │   └── [name].[hash].svg
    └── js
        ├── [id].[hash].js
        └── lib-preact.[hash].js
```

最常见的输出文件包括 Bundle 文件、JS 文件和静态资源：

- Bundle（`[name].lynx.bundle`），可通过 `pluginLynx` 的 `output.filename.bundle` 选项配置
- 懒加载 Bundle（`lazy-bundle/[name].[hash].bundle`），每个动态 `import()` 产出一个
- JS 文件（`static/js/*.js`），可通过 [`output.distPath.js`] 和 [`output.filename.js`] 配置。只有开启代码分包时才会产出，否则脚本会内联进 Bundle
- 静态资源目录（`static/{font,image,media,svg}`）

文件名中的占位符含义：

- `[name]` 表示入口名称（如 `index`、`main`）
- `[hash]` 是基于文件内容生成的哈希值
- `[id]` 是 Rspack 内部 chunk ID

### 开发环境

开发环境下会生成 `dist/.lynx` 目录用于调试：

```txt
dist/
├── .lynx
│   ├── lazy-bundle
│   │   └── [name]
│   │       ├── background.css
│   │       ├── background.js
│   │       ├── debug-metadata.json
│   │       └── tasm.json
│   └── [name]
│       ├── background.js
│       ├── debug-metadata.json
│       ├── [name].css
│       ├── main-thread.js
│       └── tasm.json
├── [name].lynx.bundle
├── lazy-bundle
│   └── [name].[hash].bundle
└── static
    ├── image
    │   ├── [name].[hash].png
    │   └── [name].[hash].svg
    └── js
        ├── [id].[hash].js
        └── lib-preact.[hash].js
```

开发环境额外生成的文件包括：

- 后台线程脚本（Background Thread Script）：内联到 Bundle 中的脚本，默认输出到 `.lynx/[name]/background.js`
- 主线程脚本（MainThread Thread Script）：默认输出到 `.lynx/[name]/main-thread.js`
- Debug Metadata：反解线上错误所需的元数据（包含 source map、字节码调试信息、UI source map 与构建信息），默认输出到 `.lynx/[name]/debug-metadata.json`，详见 [线上错误反解](/guide/devtool/map-errors-to-source)

## 修改目录结构

可以用以下配置项来调整输出目录：

- 通过 [`output.filename`] 修改文件名
- 通过 [`output.distPath`] 修改输出路径
- 通过 [`output.legalComments`] 配置许可声明文件
- 通过 [`output.sourceMap`] 配置 Source Map 文件

## 扁平化目录

若需要简化目录层级，可将目录配置设为空字符串来实现扁平化结构：

```js
import { pluginLynx } from '@lynx-js/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  output: {
    distPath: {
      js: '',
    },
  },
  plugins: [
    pluginLynx({
      output: {
        filename: {
          bundle: '[name].lynx.bundle',
        },
      },
    }),
  ],
});
```

上述配置将生成以下结构：

```bash
dist
├── [id].[hash].js
├── [id].[hash].js.map
└── [name].lynx.bundle
```

[`output.filename`]: https://rsbuild.rs/zh/config/output/filename
[`output.filename.js`]: https://rsbuild.rs/zh/config/output/filename
[`output.distPath`]: https://rsbuild.rs/zh/config/output/dist-path
[`output.distPath.js`]: https://rsbuild.rs/zh/config/output/dist-path
[`output.legalComments`]: https://rsbuild.rs/zh/config/output/legal-comments
[`output.sourceMap`]: https://rsbuild.rs/zh/config/output/source-map
