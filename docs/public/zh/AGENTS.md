# Lynx 开发前必读

> 面向已经熟悉 Web 前端技术栈的开发者，解释 Lynx 的核心理念、与 Web 差异、以及如何用 Lynx 构建跨平台应用。

---

> [!IMPORTANT] > **非常重要：**
>
> 此文档在一些陈述之后提供了参考链接，指向 Lynx 官方文档的相关章节，请**主动**阅读以获得更全面的理解。

---

## 1. Lynx 的定位与能力边界

- **What**：Lynx 是一个以 Web 技术为语义参照的跨平台渲染引擎，目标是在一套代码内覆盖 iOS、Android、HarmonyOS 以及 Web。它通过统一的元件抽象在不同宿主上创建原生视图或 Web 自定义元件，避免传统 WebView 的性能瓶颈。（参考：[Composing Elements](/zh/guide/ui/elements-components.md)）
- **Why**：移动端用户极度敏感首屏时间与交互延迟。Lynx 通过双线程 JavaScript 运行时、即时首帧渲染（Instant First-Frame Rendering, IFR）和原生渲染管线，让 React 开发体验与近原生性能同时存在。（参考：[Instant First-Frame Rendering](/zh/guide/interaction/ifr.md)）
- **How**：在工程侧使用 Rspeedy（Rspack 驱动的构建工具）生成 Lynx Bundle，前端层采用 ReactLynx（Preact 内核的 React 实现）来描述 UI，与宿主端通过 Native Modules / Custom Elements 互通。（参考：[ReactLynx](/zh/react/introduction.md), [Native Modules](/zh/guide/use-native-modules.md)）

## 2. 心智模型：把 Lynx 对齐到 Web

| Web 心智               | Lynx 对应物                                                           | 差异重点                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html` + 资源    | Lynx Bundle（二进制文件，包含 JS 字节码 + 样式）或 `template.js` 文件 | Bundle 需与 Lynx Engine 版本兼容，需设置 `engineVersion`（历史上曾称 `targetSdkVersion`）。（参考：[Compatibility](/zh/guide/compatibility.md)）                                                                                 |
| DOM + CSSOM            | 元件树（Element Tree）+ 样式系统                                      | 所有元件都类比 block-level，`view`/`text` 等自定义标签映射到原生控件。（参考：[Composing Elements](/zh/guide/ui/elements-components.md)）                                                                                        |
| 浏览器主线程           | Lynx Main Thread                                                      | 负责首屏渲染、布局、主线程脚本，运行 PrimJS 字节码。（参考：[Main Thread Runtime](/zh/guide/scripting-runtime/main-thread-runtime.md)）                                                                                          |
| 浏览器渲染进程任务队列 | Lynx Background Thread                                                | 执行 ReactLynx 调度、生命周期、绝大部分副作用。运行 PrimJS/JavaScriptCore，语法最高仅到 ES2015（构建期经 SWC 转译）。（参考：[JavaScript Runtime](/zh/guide/scripting-runtime/index.md)）                                        |
| `window`/`document`    | `lynx` 全局对象 + API 集                                              | 无 DOM API；通过 `lynx.getElementById`、SelectorQuery、`main-thread:ref` 等访问节点。（参考：[ReactLynx](/zh/react/introduction.md), [Direct Manipulation](/zh/guide/interaction/event-handling/manipulating-element.react.md)） |

## 3. 运行时架构：双线程 React 的工作方式

- **双线程并行渲染**：首屏时主线程直接执行 ReactLynx 渲染输出像素，同时后台线程构建完整节点树并与主线程状态对齐，避免白屏。（参考：[Rendering Process and Lifecycle](/zh/react/lifecycle.md), [IFR](/zh/guide/interaction/ifr.md)）
- **“你的代码运行在两个线程”**：双线程 React 意味着你的代码会在两个线程中运行。但并不是所有的代码都能在两个线程运行——一些 API 仅在后台线程提供；ReactLynx 也只会从后台线程执行事件、生命周期和 `useEffect` 等副作用。
- **`'background only'`**：无需运行在主线程（如事件处理、生命周期、副作用等）、或使用了仅在后台线程提供的 API 的函数，必须在函数体首行添加 `'background only'` 指示符；模块会通过 `import "background-only"` 表达自己预期只运行在后台线程。
- **主线程脚本（MTS）**：通过 `main-thread` 指示符标注的函数可以直接在主线程响应事件，常用于高频动画、手势和无延迟反馈。主线程事件需要用 `main-thread:` 前缀标识，使用 `main-thread:bindtap`、`useMainThreadRef` 等 API。（参考：[Main Thread Script](/zh/react/main-thread-script.md)）
- **跨线程通信**：使用 `runOnMainThread` / `runOnBackground` 进行异步调用，参数需可 JSON 序列化。

## 4. UI 构建：元件体系与原生映射

- **元件标签**：`view`、`text`、`image`、`scroll-view` 等内置标签抽象原生控件。与 HTML 不同，标签不是标准 DOM，但语法（开始标签/结束标签/属性）保持类 HTML 习惯。（参考：[Composing Elements](/zh/guide/ui/elements-components.md)）
- **跨平台映射**：同一元件自动映射到平台原生视图（如 `view` → iOS `UIView`、Android `ViewGroup`；Web → 自定义元件），无需手动分平台写代码。
- **文本语义**：必须使用 `text` 元件承载文字，不能像 Web 在 `div` 里直接写文本。行内布局依赖嵌套 `text`。（参考：[Typography](/zh/guide/styling/text-and-typography.md)）
- **可扩展性**：当内置元件不足，可注册自定义原生元件，分别在 iOS/Android/Harmony 实现，前端通过统一标签使用。（参考：[Custom Element](/zh/guide/custom-native-component.md)）

此外：

- `svg` 元件和 Web 中存在较大差异，直接将 SVG 内容作为 `content` 属性或将 SVG URL 作为 `src` 属性传递给 `<svg />` 元件：

  ```jsx
  <svg content={`<svg ... />`} />;
  // or
  <svg src={urlOfYourSvgFile} />;
  ```

## 5. 布局系统：默认 Block，支持四种布局模式

| 布局模式            | Web 对应                      | Lynx 差异                                                                                                                                          |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `display: linear`   | 无直接对应，近似更简化的 Flex | 主轴默认竖向，可用 `linear-direction`、`linear-weight` 控制尺寸分配，适合线性排布。（参考：[Linear Layout](/zh/guide/ui/layout/linear-layout.md)） |
| `display: flex`     | CSS Flexbox                   | 绝大部分属性一致，但当前不支持 `min-content`，子项收缩下限视作 `0px`。（参考：[Flexible Box Layout](/zh/guide/ui/layout/flexible-box-layout.md)）  |
| `display: grid`     | CSS Grid                      | 支持常见行列定义与 gap，暂不支持 `grid-area`、line names。（参考：[Grid Layout](/zh/guide/ui/layout/grid-layout.md)）                              |
| `display: relative` | Android RelativeLayout 心智   | 仅移动端有效，通过 `relative-*` 属性描述与兄弟/父节点的相对定位。（参考：[Relative Layout](/zh/guide/ui/layout/relative-layout.md)）               |

此外：

- 所有元件默认 `box-sizing: border-box`，无 margin collapsing。（参考：[Understanding Layout](/zh/guide/ui/layout/index.md)）
- 不存在 `inline` / `block` 切换，文本布局依赖 `text` 元件。（参考：[Typography](/zh/guide/styling/text-and-typography.md)）
- 逻辑方向（`inline-start` 等）依赖 `direction` 且需要开启 CSS 继承功能。
- 不支持 `overflow: scroll`，必须使用 `<scroll-view />` 且通过指定 `scroll-y` 或 `scroll-x` 属性之一来启用滚动。
- `position` 支持 `relative`、`absolute`、`fixed` 3种定位方式；`fixed` 的节点会被直接提升为根节点的直接子节点。

## 6. 样式系统：CSS 语法为基础，结合 Lynx 配置

- **特有单位**：支持 `rpx` 单位，适配不同屏幕尺寸
- **选择器与内联样式**：与 Web 基本一致，可结合 PostCSS/Sass 嵌套语法。（参考：[Styling with CSS](/zh/guide/ui/styling.md)）
- **特有属性**：以 `-x-` 开头的扩展属性提供移动端能力，如 `-x-auto-font-size`。（参考：[Styling with CSS](/zh/guide/ui/styling.md)）
- **主题与继承**：支持 CSS 变量、类切换等手法。普通属性默认不继承，需在 `pluginReactLynx` 中开启 `enableCSSInheritance` 或配置 `customCSSInheritanceList`。（参考：[Custom properties (`--*`): CSS variables](/zh/api/css/properties/css-variable.md)、[Theming](/zh/guide/styling/custom-theming.md)）
- **字体**：支持 `@font-face` 与 `lynx.addFont`，但宿主需实现字体加载。

## 7. ReactLynx：熟悉的 API + Lynx 约束

- **API 一致性**：与 React 几乎一致，直接 `import { useState } from '@lynx-js/react'`。底层基于 Preact。（参考：[What is ReactLynx](/zh/react/introduction.md)）
- **生命周期**：全部在后台线程异步执行，`useLayoutEffect` 被禁用，作为替代，可通过 `main-thread:bindlayoutchange` 获得布局信息及更新属性。（参考：[Rendering Process and Lifecycle](/zh/react/lifecycle.md)）
  ![生命周期图示](https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lifecycle-init-render-v3.png)
- **后台线程限定**：框架能静态分析出部分直接情形，但引入了抽象和间接之后，例如跨组件传递事件回调或自定义 Hooks 时需显式加 `'background only'` 指示符。（参考：[Thinking in ReactLynx](/zh/react/thinking-in-reactlynx.md)）
- **主线程函数**：函数体首行加入 `'main thread';`，只可在主线程环境使用（事件处理、`main-thread:ref`）。捕获到的外部变量是快照，需可 JSON 序列化，因此无法直接调用函数。
- **线程间执行**：无法直接调用另一个线程的函数，需要使用 `runOnMainThread` / `runOnBackground` 提供 `Promise` 风格互调。
- **模块系统**：同时支持 ESM 与 CommonJS，可混用；推荐使用 ESM；构建期由 Rspeedy / SWC 处理。（参考：[JavaScript Runtime](/zh/guide/scripting-runtime/index.md)）

## 8. 类型系统

- **TypeScript 支持**：官方提供 `@lynx-js/types` 类型定义，推荐全程使用 TypeScript。（参考：[TypeScript Support](/zh/rspeedy/typescript)）
- **`tsconfig.json`**：`compilerOptions.jsx` 需设为 `react-jsx`，`compilerOptions.jsxImportSource` 需设为 `@lynx-js/react`。
- **正确地导入类型**：Lynx API 类型均在 `@lynx-js/types` 包中，需显式导入，如 `import type { MainThread, NodesRef } from '@lynx-js/types'`；ReactLynx 的 API 和类型从 `@lynx-js/react` 导入；支持的 React API和类型从 `@lynx-js/react` 导入。

## 9. 事件模型：命名与传播机制

- **事件属性命名**：`bindtap`、`catchtap`、`capture-bindtap`、`global-bindtap` 等，按阶段/是否拦截区分；主线程事件需 `main-thread:` 前缀。（参考：[Event Propagation](/zh/guide/interaction/event-handling/event-propagation.md)）
- **传播阶段**：支持捕获 + 冒泡，事件链为元件树路径。非触摸类事件仅发生在目标节点。
- **事件对象差异**：后台线程收到纯 JSON；主线程事件通过 `currentTarget` 提供 `MainThread.Element` 可直接操作节点（如 `setStyleProperty`）。（参考：[Event Handling](/zh/guide/interaction/event-handling.md)）
- **全局事件**：`GlobalEventEmitter` 支持跨组件/宿主广播，必须在后台线程使用。（参考：[Event Propagation](/zh/guide/interaction/event-handling/event-propagation.md)）
- **AOP 监听**：`lynx.beforePublishEvent` 可在后台线程统一拦截事件。

## 10. 节点引用与直接操作

- **后台线程**：`useRef<NodesRef>` + `ref={...}`，通过 `invoke()`、`setNativeProps()` 操作，末尾必须 `.exec()` 提交。（参考：[Direct Manipulation](/zh/guide/interaction/event-handling/manipulating-element.react.md)）
- **主线程**：`useMainThreadRef` + `main-thread:ref` 提供 `MainThread.Element`，可直接调用 `setStyleProperty`、`invoke`。
- **选择器 API**：后台线程使用 `lynx.createSelectorQuery()` 得到 `NodesRef`；主线程使用 `lynx.querySelector()`/`querySelectorAll()` 得到 `MainThread.Element`。
- **获取事件目标**：后台线程无法在事件对象中获取到节点引用；主线程事件的 `event.currentTarget` 是 `MainThread.Element`。
- **线程模型**：后台线程对节点的引用的操作是异步的；主线程对节点的引用的操作是同步的。

案例学习：

- **获取节点布局信息**：结合具体情况选用以下之一：
  - 通过事件：使用 `bindlayoutchange` 监听布局变化事件，事件对象包含布局信息；配合 Main Thread Script 时，使用其主线程版本 `main-thread:bindlayoutchange`。
  - 直接操作节点：调用节点的 `boundingClientRect` 方法获取布局信息，后台线程使用 `NodesRef.invoke`，主线程使用 `MainThread.Element.invoke`。（参考：[Direct Manipulation](/zh/guide/interaction/event-handling/manipulating-element.react.md)）

常用 API：

- [Interface `NodesRef`](/zh/api/lynx-api/nodes-ref.md)
- [invoke()](/zh/api/lynx-api/nodes-ref/nodes-ref-invoke.md)
- [setNativeProps()](/zh/api/lynx-api/nodes-ref/nodes-ref-set-native-props.md)
- [Interface `MainThread.Element`](/zh/api/lynx-api/main-thread/main-thread-element.md)
- [animate()](/zh/api/lynx-api/main-thread/lynx-animate-api.md)
- [Interface `SelectorQuery`](/zh/api/lynx-api/selector-query.md)
- [exec()](/zh/api/lynx-api/selector-query/selector-query-exec.md)
- [select()](/zh/api/lynx-api/selector-query/selector-query-select.md)

## 11. 数据输入与宿主互通

- **Init Data**：宿主通过 `LynxView.loadTemplate` 注入初始数据，前端 `useInitData` 即取即用；数据更新触发自动重渲染。（参考：[Using Data from Host Platform](/zh/guide/use-data-from-host-platform.md)）
- **Data Processor**：`lynx.registerDataProcessors` 可在前端统一规范多端数据结构，支持命名 processor。
- **全局属性**：`lynx.__globalProps` 可读取宿主配置（如暗黑模式），结合主题切换；具体属性由宿主定义；如宿主未主动配置，`lynx.__globalProps` 为 `null` 或空对象。
- **确保 IFR**：只要初始数据同步传入、Lynx Bundle 可同步加载，即可在主线程实现零白屏首帧。（参考：[IFR](/zh/guide/interaction/ifr.md)）

## 12. 宿主能力扩展

- **Native Modules**：声明 TypeScript 类型后，可在 iOS/Android/Harmony 各自实现并注册；前端通过 `NativeModules.xxx` 在后台线程调用。（参考：[Native Modules](/zh/guide/use-native-modules.md)）
- **Custom Elements**：当需要更贴近原生控件的能力（如自定义输入框），在宿主侧继承 `LynxUI` 实现属性、事件、命令，前端像使用内置元件一样引用。（参考：[Custom Element](/zh/guide/custom-native-component.md)）
- **SelectorQuery 调原生命令**：可通过 `invoke({ method: 'focus' })` 调用自定义元件暴露的原生方法；查询特定元件的文档获取支持的方法列表。

## 13. 网络与运行环境差异

- **Fetch API**：接口契合 Web，但依赖宿主提供 HTTP Service；支持 `lynxExtension.useStreaming` 开启流式响应，自行读取 `response.body`。某些兼容性差异需查官方说明。（参考：[Networking](/zh/guide/interaction/networking.md)）
- **编码工具**：由于 PrimJS 暂不支持 `TextEncoder`/`TextDecoder`，需使用 `TextCodecHelper` 实现 UTF-8 编解码。（参考：[Networking](/zh/guide/interaction/networking.md)）
- **全局对象限制**：无 `window`、`document`，部分浏览器 API 需通过 `lynx` 等替代（如 `lynx.reload`）。（参考：[ReactLynx](/zh/react/introduction.md)）
- **Polyfill & 语法**：主线程 PrimJS 最高支持 ES2019，后台线程 ES2015；构建阶段自动注入 polyfill（iOS 为主）。（参考：[JavaScript Runtime](/zh/guide/scripting-runtime/index.md)）

## 14. 性能工具与调优手段

- **Main Thread Script**：确保动画/手势无延迟，注意线程隔离与数据同步。（参考：[Main Thread Script](/zh/react/main-thread-script.md)）
- **NodesRef.invoke**：批量调用原生特性（如 `autoScroll`）避免跨线程瓶颈。（参考：[Direct Manipulation](/zh/guide/interaction/event-handling/manipulating-element.react.md)）
- **Lynx DevTool & Trace**：桌面 DevTool 提供 Elements/Console/Sources/Trace 面板，可记录渲染流水、分析 ReactLynx Render Pipeline。（参考：[Lynx DevTool](/zh/guide/devtool.md), [Trace](/zh/guide/devtool/trace.md)）
- **Performance Metrics**：通过 `lynx.performance`、`PerformanceObserver` 采集 FCP、InitContainer 等指标。（参考：[Performance API](/zh/guide/performance/metrics/performance-api.md)）

## 15. 工程实践与工具链

- **项目初始化**：`pnpm create rspeedy` 一键生成 ReactLynx 工程，自动带上 Rspeedy 配置、脚手架示例。（参考：[Quick Start](/zh/rspeedy/start/quick-start.md)）
- **开发调试**：`pnpm dev` 启动 Rspeedy Dev Server，终端输出二维码，使用 LynxExample App（iOS/Android/Harmony 模拟器）扫描即可热更新预览。（参考：[Quick Start](/zh/rspeedy/start/quick-start.md)）
- **DevTool 调试**：连接设备后使用 Lynx DevTool 桌面端调试 JS、查看节点、性能记录。（参考：[Lynx DevTool](/zh/guide/devtool.md)）
- **构建产物**：Rspeedy 输出的 Bundle 包含后台线程脚本（文本）、主线程字节码、样式等资源；需要 `DEBUG=rspeedy` 环境变量以输出中间产物（组成Lynx Bundle 的后台线程脚本（文本）、主线程字节码、样式、SourceMap 等）到 `dist/.rspeedy` 目录，否则只会输出最终的 Lynx Bundle 文件。（参考：[Output Files](/zh/rspeedy/output.md)）

## 16. 与 Web 的关键差异清单

1. **没有 DOM**：不能直接使用 DOM API、`document.querySelector`、浏览器全局对象；改用 Lynx 提供的选择器与引用体系。
2. **双线程模型**：渲染逻辑需区分后台线程与主线程，副作用或其他只能在后台线程执行的函数必须添加 `'background only'` 指示符；
3. **事件命名不同**：采用 `bind/catch/capture` 前缀，主线程事件加 `main-thread:`，并有 `global-bind` 跨组件监听。
4. **布局基于元件而非文本**：所有元件默认 block，自定义 `display` 才能切换布局；文本必须使用 `text` 元件。
5. **CSS 继承按需开启**：普通属性默认不继承，需要配置；`box-sizing` 固定为 `border-box`。
6. **语法支持受限**：主线程 ES2019、后台线程 ES2015，构建期需要依赖 Rspeedy/SWC。
7. **无 `useLayoutEffect`**：改用布局事件或主线程脚本处理同步测量与更新需求。
8. **依赖宿主服务**：网络请求（Fetch）、字体加载、Native Modules 均需宿主实现支持。
9. **Bundle 与引擎版本耦合**：发布时必须确保 `engineVersion` 正确匹配宿主。
10. **首屏策略不同**：通过 IFR 保证无白屏，但要求资源同步可用、数据提前准备。

## 17. 快速对照表

| 场景         | Web 习惯                                        | Lynx 推荐实践                                                                                                                                                 |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 全局状态更新 | `window.dispatchEvent`                          | `GlobalEventEmitter.toggle` / 宿主 `sendGlobalEvent`                                                                                                          |
| 同步测量 DOM | `useLayoutEffect` + `boundingClientRect`        | 直接通过 `main-thread:bindlayoutchange` 的 Event 对象获得；或者使用 `main-thread:ref` 获得节点ref，然后调用 `MainThread.Element.invoke('boundingClientRect')` |
| 手势动画     | JS 主线程 event handler                         | `main-thread:bindtouchmove` + `'main thread'` 函数直接操作样式                                                                                                |
| DOM ref      | `useRef<HTMLDivElement>`                        | 后台线程 `useRef<NodesRef>` + `.invoke()`；高性能场景用 `useMainThreadRef`                                                                                    |
| SSR          | Next.js/自建 SSR                                | IFR（主线程同步渲染）+ 宿主提供 `initData`                                                                                                                    |
| 动态主题     | CSS 变量 + `document.documentElement.classList` | `themeClass` 绑定 `lynx.__globalProps.appTheme` + CSS 变量                                                                                                    |
| 包体积优化   | 分析产物中的 JS 文件                            | 分线程进行优化：分析 `main-thread.js` 以优化主线程包的包体积；分析 `background.js` 以优化后台线程包的包体积                                                   |
| 滚动容器     | 使用 `overflow: scroll` 创建一个滚动容器        | 必须使用 `<scroll-view />`，通过指定 `scroll-y` 或 `scroll-x` 属性之一来启用滚动。                                                                            |

## 18. 附录：仅在后台线程提供的 API

- `lynx.getJSModule`
- `NativeModules`
- `lynx.createSelectorQuery`
- `lynx.getElementById`
- `lynx.reload`
- `lynx.performance.addTimingListener`, `lynx.performance.removeTimingListener`, `lynx.performance.removeAllTimingListener`
- `fetch`
- `setTimeout`, `clearTimeout`
- `setInterval`, `clearInterval`
- `requestAnimationFrame`, `cancelAnimationFrame`

## 19. 附录：如果你喜欢 Learn from Examples

以下是一些 Lynx 官方 Tutorial，涵盖从基础到进阶的多种使用场景，推荐跟随学习：

- 产品列表——本教程将引导你逐步实现一个产品双列页面：[Tutorial Gallery](/zh/guide/start/tutorial-gallery.md)，你将学到：
  - 构建基本UI并添加样式、交互
  - 组件化
  - 使用 `<list />` 元件实现高性能长列表渲染
  - 直接操作节点：使用 `NodesRef.invoke` 实现自动滚动
  - 自定义滚动条，并使用 [Main Thread Script](/zh/react/main-thread-script.md) 优化滚动性能
- 产品详情——本教程将通过实现一个轮播组件，带你学习如何编写高性能的交互代码：[Tutorial Product Detail](/zh/guide/start/tutorial-product-detail.md)，你将学到：
  - 直接操作节点：使用 `NodesRef.setNativeProps` 更新元件的样式和属性
  - 使用 [Main Thread Script](/zh/react/main-thread-script.md) 降低延迟
  - 主线程函数与后台线程函数互相调用
  - 主线程脚本与后台线程脚本值的传递

## 20. 附录：部分主要内置元件

- [元件 `<view>`](/zh/api/elements/built-in/view.md)
- [元件 `<text>`](/zh/api/elements/built-in/text.md)
- [元件 `<image>`](/zh/api/elements/built-in/image.md)
- [元件 `<scroll-view>`](/zh/api/elements/built-in/scroll-view.md)
- [元件 `<list>`](/zh/api/elements/built-in/list.md)
- [元件 `<page>`](/zh/api/elements/built-in/page.md)
- [元件 `<frame>`](/zh/api/elements/built-in/frame.md)
- [元件 `<input>`](/zh/api/elements/built-in/input.md)
- [元件 `<textarea>`](/zh/api/elements/built-in/textarea.md)

---

通过以上内容，你应该能够将 Web 经验迁移到 Lynx，同时理解它的独特约束与优势。在实际项目中，只要遵守双线程编程模型、善用主线程脚本与宿主数据通道，就能构建出兼顾体验与生产效率的跨平台应用。
