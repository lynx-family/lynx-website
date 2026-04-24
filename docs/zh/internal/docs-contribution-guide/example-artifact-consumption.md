# Example 发布产物消费协议

这份文档只描述一件事:

- 消费方如何下载 example 发布产物
- 消费方要求产物目录和元数据是什么格式

这不是 example 工程文档，不涉及 example 的源码组织、构建方式、发布流程或仓库布局。

## 1. 总体模型

消费方应当把每个 example 当作一组可通过静态 HTTP 访问的文件。

对消费方来说，一个 example 只需要满足下面的目录约定:

```text
<example-base-path>/
  <example-id>/
    example-metadata.json
    ...metadata 中列出的其它文件
```

在当前站点实现里:

- `example-base-path` 配置为 `/lynx-examples`
- 文档站点带有 base path 时，会先经过站点的 `withBase`
- 所以线上实际访问路径通常是 `/next/lynx-examples/<example-id>/...`

## 2. 推荐的下载顺序

对于一个消费输入：

```json
{
  "example": "view",
  "defaultFile": "src/App.tsx"
}
```

消费侧的运行时下载逻辑可以概括为:

1. 先请求 `/<base>/<example>/example-metadata.json`
2. 根据 `files` 渲染文件树
3. 根据 `defaultFile` 请求对应文件内容，或直接把它当作静态资源 URL
4. 根据 `templateFiles` 选择当前入口 bundle
5. 如果入口带 `webFile`，则可以启用 Web 预览
6. 二维码预览使用 Lynx bundle 的绝对地址

按当前实现，核心请求地址分别是:

- 元数据:
  - `${EXAMPLE_BASE_URL}/${example}/example-metadata.json`
- 普通文件:
  - `${EXAMPLE_BASE_URL}/${example}/${currentName}`
- 当前 Lynx 入口 bundle:
  - `${window.location.origin}${EXAMPLE_BASE_URL}/${example}/${templateFile.file}`
- 当前 Web 预览 bundle:
  - `${window.location.origin}${EXAMPLE_BASE_URL}/${example}/${templateFile.webFile}`

## 3. `example-metadata.json` 格式

当前协议对应的元数据结构如下:

```json
{
  "name": "examples/view",
  "files": [
    "dist/main.lynx.bundle",
    "dist/main.web.bundle",
    "src/App.tsx",
    "src/index.tsx",
    "package.json",
    "README.md"
  ],
  "templateFiles": [
    {
      "name": "main",
      "file": "dist/main.lynx.bundle",
      "webFile": "dist/main.web.bundle"
    }
  ],
  "previewImage": "preview-image.png",
  "exampleGitBaseUrl": "https://github.com/xxx/xxx/tree/main"
}
```

字段说明:

- `name: string`
  - example 的展示名或来源标识
  - 主要用于 UI 展示，不参与 URL 计算

- `files: string[]`
  - 可在代码区展示的文件列表
  - 每个值都是相对 example 根目录的路径
  - 消费方通常会按这个列表渲染文件树，并在用户选中文件时请求对应路径

- `templateFiles: Array<{ name: string; file: string; webFile?: string }>`
  - example 的可执行入口列表
  - `name` 是入口名，用于多入口切换
  - `file` 是 Lynx bundle 路径，用于二维码预览
  - `webFile` 是可选字段，对应 Web 预览 bundle

- `previewImage?: string`
  - 可选
  - 如果存在，消费方可以把它拼成 `<example-base>/<example>/<previewImage>` 用作静态预览图

- `exampleGitBaseUrl?: string`
  - 可选
  - 用于 UI 中跳转到源码仓库
  - 不影响文件下载

## 4. 最小可用产物

如果只考虑让一个同类消费方能正常消费，一个 example 最少需要:

```text
<example-id>/
  example-metadata.json
  dist/main.lynx.bundle
  package.json
```

对应元数据示例:

```json
{
  "name": "examples/minimal",
  "files": [
    "dist/main.lynx.bundle",
    "package.json"
  ],
  "templateFiles": [
    {
      "name": "main",
      "file": "dist/main.lynx.bundle"
    }
  ]
}
```

这个格式下:

- 代码区可以展示 `package.json` 或其它列入 `files` 的文本文件
- 二维码预览可用
- Web 预览不可用，因为没有 `webFile`
- 静态截图预览不可用，因为没有 `previewImage`

补充说明:

- 这里把 `package.json` 放进最小示例，是因为当前站点实现默认展示的 `defaultFile` 就是 `package.json`
- 如果调用方显式传入了别的 `defaultFile`，那么协议本身并不强制要求发布产物一定包含 `package.json`

## 5. 单入口和多入口格式

### 单入口

```json
{
  "templateFiles": [
    {
      "name": "main",
      "file": "dist/main.lynx.bundle",
      "webFile": "dist/main.web.bundle"
    }
  ]
}
```

适合只有一个可运行入口的 example。

### 多入口

```json
{
  "templateFiles": [
    {
      "name": "fib",
      "file": "dist/fib.lynx.bundle",
      "webFile": "dist/fib.web.bundle"
    },
    {
      "name": "init_data",
      "file": "dist/init_data.lynx.bundle",
      "webFile": "dist/init_data.web.bundle"
    }
  ]
}
```

适合一个 example 下有多个可切换演示入口的情况。

多数同类消费实现会按下面的优先级选择默认入口:

1. `defaultEntryFile`
2. `defaultEntryName`
3. `templateFiles[0]`

## 6. `files` 列表的要求

`files` 不只是清单，它直接驱动消费方的文件树和代码读取行为。

因此消费侧需要注意:

- `files` 中的每一项都应该能通过静态 URL 访问
- 路径必须是相对 example 根目录的相对路径
- 如果某个文件会在代码区打开，它必须能被 `fetch(...).text()` 读取
- 如果某个文件是资源文件，消费方通常不会把它当文本读取，而是直接拼成资源 URL

当前实现里会被识别为“资源文件”的扩展名包括:

- `.png`
- `.jpg`
- `.jpeg`
- `.gif`
- `.webp`
- `.mp4`
- `.avi`
- `.pdf`
- `.tif`
- `.psd`
- `.zip`
- `.tar`
- `.tgz`
- `.ttf`
- `.woff`
- `.woff2`
- `.eot`
- `.svg`
- `.ico`

这意味着:

- 文本类文件会被下载为字符串并显示在代码区
- 上述资源类文件会被直接当作 URL 展示或下载，不会做文本解析

## 7. Web 预览产物的要求

如果要让消费方的 Web 预览可用，`templateFiles[*].webFile` 必须存在，并指向一个可通过 HTTP 获取的 bundle 文件。

一种典型的 Web 预览消费逻辑会:

1. 请求 `webFile` 对应的 URL
2. 读取返回的文本
3. 将文本按 JSON 解析
4. 把解析后的 template 对象交给 `lynx-view`

所以从消费协议角度，`webFile` 必须满足:

- 可通过 `fetch(url).text()` 获取
- 返回内容必须是合法 JSON 字符串
- 返回内容需要符合 `@lynx-js/web-core` 可加载的 template 结构

这里不要求文档理解这个 JSON 的内部生成方式，但必须知道一点:

- `webFile` 不是任意 JS 文件
- 它必须是 `lynx-view` 可以直接加载的 template JSON 文本

## 8. 二维码预览产物的要求

二维码预览依赖 `templateFiles[*].file`。

消费方通常会把它拼成绝对 URL:

```text
${window.location.origin}${EXAMPLE_BASE_URL}/${example}/${templateFile.file}
```

默认情况下，二维码里编码的就是这个 Lynx bundle 地址本身。

如果消费方支持 `schema` 模板，则会把上面的 URL 替换进 `{{{url}}}` 占位符，例如:

```text
lynx://open?url={{{url}}}
```

会变成:

```text
lynx://open?url=https://your-site/next/lynx-examples/view/dist/main.lynx.bundle
```

因此从产物格式上看，二维码预览要求:

- `templateFiles[*].file` 必须存在
- 它必须是对外可访问的 Lynx bundle 文件

## 9. 静态截图预览产物的要求

静态预览图有两种来源:

- 消费方显式传入图片 URL
- `example-metadata.json` 里的 `previewImage`

如果使用元数据字段，则 `previewImage` 也是 example 根目录下的相对路径，例如:

```json
{
  "previewImage": "preview-image.png"
}
```

对应访问地址:

```text
<example-base-path>/<example-id>/preview-image.png
```

它是可选能力，不影响代码浏览、二维码预览和 Web 预览的基础消费。

## 10. 推荐的发布目录示例

下面是一个对消费方友好的完整 example 发布目录:

```text
view/
  example-metadata.json
  package.json
  README.md
  preview-image.png
  src/
    App.tsx
    index.tsx
  dist/
    main.lynx.bundle
    main.web.bundle
```

对应元数据:

```json
{
  "name": "examples/view",
  "files": [
    "dist/main.lynx.bundle",
    "dist/main.web.bundle",
    "src/App.tsx",
    "src/index.tsx",
    "package.json",
    "README.md"
  ],
  "templateFiles": [
    {
      "name": "main",
      "file": "dist/main.lynx.bundle",
      "webFile": "dist/main.web.bundle"
    }
  ],
  "previewImage": "preview-image.png",
  "exampleGitBaseUrl": "https://github.com/lynx-family/lynx-examples/tree/main"
}
```

## 11. 消费侧可以直接记住的约束

- 每个 example 都必须有 `example-metadata.json`
- `files` 是文件树和代码下载清单
- `templateFiles[*].file` 是 Lynx 入口 bundle
- `templateFiles[*].webFile` 是可选的 Web 预览入口
- `previewImage` 是可选的静态截图
- 所有路径都相对 example 根目录
- 所有这些文件都必须能被静态 HTTP 直接访问

## 12. 当前仓库中的真实样本

可以直接参考这些已发布产物:

- `docs/public/lynx-examples/view/example-metadata.json`
- `docs/public/lynx-examples/ifr/example-metadata.json`
- `docs/public/lynx-examples/fetch/example-metadata.json`

这三个样本分别覆盖:

- 单入口且带 Web bundle
- 多入口且带 Web bundle
- 单入口但不带 Web bundle
