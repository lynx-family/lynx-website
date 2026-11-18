// Website-owned explanations for generated Web Host references.
// Keep runtime signatures in the upstream declarations; these overlays add
// usage context without changing the API contract.
const guide = '/lynxtron/learn/running-on-web';
const descriptions = {
  en: {
    index: `## Web host capabilities

Symmetric Host is the architecture of providing a consistent host capability interface to shared Lynx UI through platform-specific adapters. This subpath configures the browser host; it does not provide a Node.js runtime in the browser.

- **HostConfig** combines optional browser main-thread bridge handlers and background adapter configuration.
- **MainThreadBridge** maps method names to browser main-thread handlers called through RPC.
- **BackgroundServiceConfig** supplies the built adapter script URL through \`scriptURL\`.

See [Running Lynxtron on the Web](${guide}) for the architecture, generated files, and a complete bridge example.`,
    'Function.setupSymmetricHost': `## Usage on the Web

Call this function in the browser main thread to configure Native Modules on a \`<lynx-view>\`, before loading its bundle. Import it from \`@lynx-js/lynxtron/web-host\`.

\`config.bridge\` registers browser main-thread handlers exposed through \`NativeModules.bridge\`. The Web proxy passes the handler result to a trailing callback. Background adapter exports are exposed through \`NativeModules.nodejs.exposed\`; they do not provide a Node.js runtime.

Configure both paths in one call when needed: the current implementation replaces \`nativeModulesMap\` and \`onNativeModulesCall\` rather than merging previous registrations.

See [Running Lynxtron on the Web](${guide}) for a complete example and background adapter setup.`,
    'Interface.HostConfig': `## Configuration roles

\`bridge\` supplies browser main-thread handlers for \`NativeModules.bridge\`. \`nodejs\` supplies background adapter configuration for \`NativeModules.nodejs.exposed\`. Each property is optional; omitting it leaves that module unregistered by this function.

See [Running Lynxtron on the Web](${guide}) for how these paths correspond to desktop capabilities.`,
    'Interface.MainThreadBridge': `## Browser main-thread handlers

Each key names a handler exposed through \`NativeModules.bridge\`. The handler executes on the browser main thread and may use browser APIs such as dialogs and DOM access. Handlers can return a value or a Promise; the current Web proxy delivers the resolved value to the caller's trailing callback.

Handlers accept the arguments passed by the UI, as used by the template's \`bridge.call(method, params, callback)\` pattern. See [Running Lynxtron on the Web](${guide}) for a complete bridge example.`,
    'Interface.BackgroundServiceConfig': `## Background adapter configuration

This configuration belongs to \`HostConfig.nodejs\`, which supplies capabilities exposed as \`NativeModules.nodejs.exposed\`.

Set \`scriptURL\` to the built, \`importScripts\`-compatible adapter script. Relative URLs resolve against the browser page URL. The script runs inside the Lynx background Worker and exports capabilities with \`contextBridge.exposeInLynxBTS\`; the host exposes those exports as \`NativeModules.nodejs.exposed\`.

See [Running Lynxtron on the Web](${guide}) for the adapter's execution environment and configuration.`,
  },
  zh: {
    index: `## Web 宿主能力

Symmetric Host（对称宿主）是通过各平台适配层，为共享 Lynx UI 提供一致宿主能力接口的架构模式。此子路径用于配置浏览器宿主，并不为浏览器提供 Node.js 运行时。

- **HostConfig**：组合可选的浏览器主线程 bridge 处理器与背景适配配置。
- **MainThreadBridge**：将方法名映射到通过 RPC 调用的浏览器主线程处理器。
- **BackgroundServiceConfig**：通过 \`scriptURL\` 指定构建后的适配脚本 URL。

架构、生成文件和完整 bridge 示例参见[在 Web 中运行 Lynxtron](${guide})。`,
    'Function.setupSymmetricHost': `## 在 Web 中使用

在浏览器主线程调用此函数，为 \`<lynx-view>\` 配置 Native Modules，并在加载 bundle 前完成注册。从 \`@lynx-js/lynxtron/web-host\` 导入此函数。

\`config.bridge\` 注册通过 \`NativeModules.bridge\` 暴露的浏览器主线程处理器；Web 代理将处理器结果传给末尾回调。背景适配脚本导出的能力通过 \`NativeModules.nodejs.exposed\` 暴露，并不提供 Node.js 运行时。

同时需要两条路径时，在一次调用中配置：当前实现会替换 \`nativeModulesMap\` 和 \`onNativeModulesCall\`，而非合并此前的注册。

完整示例及背景适配配置方式参见[在 Web 中运行 Lynxtron](${guide})。`,
    'Interface.HostConfig': `## 配置职责

\`bridge\` 为 \`NativeModules.bridge\` 提供浏览器主线程处理器；\`nodejs\` 为 \`NativeModules.nodejs.exposed\` 提供背景适配配置。两项均可选，省略某项时，此函数不会注册对应模块。

这两条路径与桌面能力的对应关系参见[在 Web 中运行 Lynxtron](${guide})。`,
    'Interface.MainThreadBridge': `## 浏览器主线程处理器

每个键对应一个通过 \`NativeModules.bridge\` 暴露的处理器。处理器在浏览器主线程执行，可使用弹窗、DOM 操作等浏览器 API。处理器可以返回值或 Promise；当前 Web 代理将解析后的结果传给调用方的末尾回调。

处理器接收 UI 传入的参数，模板的 \`bridge.call(method, params, callback)\` 使用了多参数调用模式。完整 bridge 示例参见[在 Web 中运行 Lynxtron](${guide})。`,
    'Interface.BackgroundServiceConfig': `## 背景适配配置

此配置用于 \`HostConfig.nodejs\`，为 \`NativeModules.nodejs.exposed\` 提供能力。

将 \`scriptURL\` 设置为构建后的、兼容 \`importScripts\` 的适配脚本 URL。相对 URL 基于浏览器页面 URL 解析。脚本在 Lynx 背景 Worker 中运行，通过 \`contextBridge.exposeInLynxBTS\` 导出能力；宿主将其暴露为 \`NativeModules.nodejs.exposed\`。

适配脚本的执行环境与配置方式参见[在 Web 中运行 Lynxtron](${guide})。`,
  },
};

export const lynxtronWebHostDocOverlays = Object.entries(descriptions).flatMap(
  ([locale, pages]) =>
    Object.entries(pages).map(([page, content]) => ({
      id: `lynxtron-web-host-${page.replaceAll('.', '-').toLowerCase()}`,
      target: `docs/${locale}/lynxtron/api/@lynx-js/lynxtron/web-host/${page}.mdx`,
      content,
      tableDescriptions:
        page === 'index'
          ? locale === 'en'
            ? {
                HostConfig:
                  'Optional browser bridge and background adapter configuration.',
                MainThreadBridge:
                  'Browser main-thread handlers exposed through RPC.',
                BackgroundServiceConfig: 'Built background adapter script URL.',
              }
            : {
                HostConfig: '可选的浏览器 bridge 与背景适配配置。',
                MainThreadBridge: '通过 RPC 暴露的浏览器主线程处理器。',
                BackgroundServiceConfig: '构建后的背景适配脚本 URL。',
              }
          : undefined,
    })),
);
