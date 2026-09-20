---
description: 'Lynx Bundle 是什么，它和 Web 产物有什么不同，以及它是怎么被构建出来的。'
---

# Lynx Bundle 是什么？

Lynx Bundle 是 Lynx 应用的交付产物：一个后缀为 `.lynx.bundle` 的二进制文件。容器拿到它的 URL 或内容，交给 Lynx Engine 加载，页面就渲染出来了。

Web 应用交付的是一组文件——HTML 入口、若干 JS、若干 CSS，浏览器按 HTML 里的引用逐个请求。Lynx 不是这样：一次构建只产出一个文件，样式和脚本都编码在里面。

## 和 Web 产物的差异

|          | Web                            | Lynx                                             |
| -------- | ------------------------------ | ------------------------------------------------ |
| 入口     | `index.html`                   | 没有 HTML，容器直接加载 Bundle                   |
| 样式     | 独立的 `.css` 文件，运行时请求 | 解析成样式结构编码进 Bundle，不单独产出          |
| 脚本     | 独立的 `.js` 文件，运行时请求  | 默认内联进 Bundle                                |
| 静态资源 | 独立文件                       | 同样是独立文件，小体积的会内联成 data URI        |
| 线程     | 单线程                         | 主线程和后台线程各一份代码，都在同一个 Bundle 里 |

静态资源是唯一还留在 `dist/` 里的部分。完整的目录结构见[构建输出文件](./output.md)。

## Bundle 里有什么

一个 Bundle 至少包含四类内容：

- **主线程代码**：负责首屏元素的创建，对应中间产物里的 `main-thread.js`
- **后台线程代码**：完整的业务逻辑，对应 `background.js`
- **样式**：所有 CSS 解析后的结构化数据
- **页面配置**：`enableCSSInheritance`、`enableNewGesture` 这类开关，以及构建所用的框架等元信息

## 双线程产物是怎么来的

Lynx 的双线程架构要求同一份源码编译出两份产物。构建时通过 Rspack 的 **layer** 把它们分开：主线程一层、后台线程一层，各自是独立的模块图。

分层带来两个直接结果。一是同一个模块在两层里可以解析到不同实现，比如 ReactLynx 在主线程用 `@lynx-js/react/lepus`，在后台线程用 `@lynx-js/react`。二是 `background only` 这类标记能按层生效——被标记的代码不会进入主线程那一层，首屏路径因此更轻。

两层的产物会落到中间产物目录 `dist/.lynx/<entry>/`：

```txt
dist/.lynx/<entry>/
├── main-thread.js      # 主线程层的编译结果
├── background.js       # 后台线程层的编译结果
├── <entry>.css         # 样式
├── tasm.json           # 编码器的输入
└── debug-metadata.json # 反解线上错误用的元数据
```

这些文件只在开发构建、或者 `DEBUG` 里带 `lynx` 时才留在磁盘上。生产构建里它们同样会产生，但编码进 Bundle 之后就从产物里删掉了。

## 从中间产物到二进制

`tasm.json` 是编码器的输入，也是 Bundle 的可读版本。它把上面这些内容组织成几个字段：

| 字段              | 内容                                   |
| ----------------- | -------------------------------------- |
| `lepusCode`       | 主线程代码                             |
| `manifest`        | 后台线程代码，`/app-service.js` 是入口 |
| `css`             | 样式的结构化数据                       |
| `sourceContent`   | 页面配置、所用框架、应用类型           |
| `compilerOptions` | 编码器开关                             |

最后一步由 [`@lynx-js/tasm`](https://www.npmjs.com/package/@lynx-js/tasm) 完成：它读取 `tasm.json` 的内容，编码成二进制写进 `.lynx.bundle`。

想看某次构建到底编码了什么，直接打开 `dist/.lynx/<entry>/tasm.json` 就行。

## 一个应用可以有多个 Bundle

主 Bundle 之外还有两种：

- **懒加载 Bundle**：动态 `import()` 的组件会各自编码成独立的 `.lynx.bundle`，输出到 `lazy-bundle/` 下，运行时按需加载。详见[代码拆分](/zh/react/code-splitting.md)。
- **External Bundle**：把公共依赖单独构建成一个 Bundle，多个应用共享，详见 [External Bundle](./external-bundle.mdx)。

## Web 产物

同一份源码也可以构建到 Web。这时 Rsbuild 的环境名是 `web`，产出的是 `.web.bundle`，由 `<lynx-view url="...">` 加载。文件名里的 `[platform]` 占位符就是环境名，所以默认的 `[name].[platform].bundle` 在两种环境下分别得到 `main.lynx.bundle` 和 `main.web.bundle`。

## 下一步

- [Rsbuild 和 Rspeedy](./tools.md)：怎么构建 Lynx Bundle
- [构建输出文件](./output.md)：产物目录结构和文件名配置
