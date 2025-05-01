# 测试概览

在 React 生态中，测试是一个重要的话题，目前 React 生态中也有很多优秀的测试方案，大概可以分为 2 类：

- 端到端测试：在真实的浏览器环境中渲染组件，对整个应用的行为进行测试，底层往往需要用到 Puppeteer、Playwright 等工具提供一个真实的浏览器环境。
- 单元测试：在纯粹的 JS 环境中渲染组件，然后断言组件的渲染结果以及组件的行为，底层往往需要用到 jsdom、happy-dom 等来模拟浏览器环境，在 ReactLynx 中，则需要使用 `@lynx-js/test-environment`。

在 ReactLynx 中，对于端到端测试，可以基于 [Lynx for Web](guide/start/fragments/web/integrating-lynx-with-web)，将产物编译至 Web 环境，然后基于 Puppeteer 等工具进行测试。

对于单元测试，我们提供了 [ReactLynx Testing Library](./react-lynx-testing-library/index.mdx)，基于 jsdom 等工具进行测试，从而实现对 ReactLynx 组件的单元测试。如果你之前已经使用过 [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)，那么你会发现 ReactLynx Testing Library 的使用很简单，因为两者的 API 非常相似。

## 如何选择测试方案

端到端测试和单元测试各有优劣，你可以根据自己的需求来选择合适的测试方案。下表对比了端到端测试和单元测试的差异：

| 对比项   | 端到端测试                              | 单元测试                                 |
| -------- | --------------------------------------- | ---------------------------------------- |
| 测试范围 | 测试整个应用的行为                      | 测试组件的行为                           |
| 测试速度 | 测试速度较慢，需要启动真实的浏览器环境  | 测试速度较快，不需要启动真实的浏览器环境 |
| 代码打包 | 会使用 Rspeedy 进行打包，和真实情况接近 | 只转译代码不打包，Lynx 行为均为 mock     |
