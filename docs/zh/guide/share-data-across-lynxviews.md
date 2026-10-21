---
title: 跨 LynxView 共享数据
description: 介绍如何通过 SessionStorage 在多个 LynxView 之间共享缓存数据，包括共享范围、Android 和 iOS 原生配置及生命周期管理。
---

# 跨 LynxView 共享数据

`SessionStorage` 支持 LynxView 读取、写入和监听 WhiteBoard 中的缓存数据。跨 View 共享需要原生侧配置，仅调用这些 API 不会将不同 LynxView 的存储空间关联起来。

## 共享范围

`SessionStorage` 的共享范围由 WhiteBoard 决定，并不是整个应用。要在 Android 或 iOS 的多个 LynxView 之间共享数据，需要在**创建这些 View 时配置同一个 `LynxGroup` 实例**。分别创建名称或 ID 相同的 Group，并不会共享它们的 WhiteBoard。

### Android

创建 Group 时需要显式开启 WhiteBoard，该开关默认关闭。所有需要共享数据的 LynxView 都应复用这个 Group：

```java
LynxGroup sharedGroup = new LynxGroup.LynxGroupBuilder()
    .setEnableWhiteBoard(true)
    .build();

LynxView firstView = new LynxView(context,
    new LynxViewBuilder().setLynxGroup(sharedGroup));
LynxView secondView = new LynxView(context,
    new LynxViewBuilder().setLynxGroup(sharedGroup));
```

在这些页面需要共享数据期间，应保持共享 Group 的生命周期。仅复用 Group 而未开启 WhiteBoard，仍无法跨 View 共享存储数据。

所有参与共享的 LynxView 都销毁且不再需要该 Group 后，应调用 `sharedGroup.destroy()` 释放其原生 WhiteBoard 内存。仅释放 Java 引用不会回收这部分内存。应由 Group 的持有方统一执行一次清理，不要让每个页面在退出时各自销毁共享 Group。

### iOS

`LynxGroup` 会在初始化时创建 WhiteBoard。所有参与共享的 LynxView 都应在各自的 Builder 中配置同一个 Group 实例。

```objc
LynxGroup *sharedGroup = [[LynxGroup alloc] initWithName:@"shared-storage"];

LynxView *firstView = [[LynxView alloc] initWithBuilderBlock:^(LynxViewBuilder *builder) {
  builder.group = sharedGroup;
}];
LynxView *secondView = [[LynxView alloc] initWithBuilderBlock:^(LynxViewBuilder *builder) {
  builder.group = sharedGroup;
}];
```

没有共享 WhiteBoard 时，每个 LynxView 使用各自的存储空间，一个 View 写入的值无法在另一个 View 中读取或监听。`getSessionStorageItem`、`subscribeSessionStorage` 和 `unsubscribeSessionStorage` 也遵循相同的共享范围。

## 相关 API

请根据代码所在的线程查看对应的 API 文档。

| 操作         | 后台线程                                                                               | 主线程                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 写入数据     | [setSessionStorageItem](../api/lynx-api/lynx/lynx-set-session-storage.mdx)             | [setSessionStorageItem](../api/lynx-api/main-thread/lynx-set-session-storage.mdx)             |
| 读取数据     | [getSessionStorageItem](../api/lynx-api/lynx/lynx-get-session-storage.mdx)             | [getSessionStorageItem](../api/lynx-api/main-thread/lynx-get-session-storage.mdx)             |
| 订阅数据变化 | [subscribeSessionStorage](../api/lynx-api/lynx/lynx-subscribe-session-storage.mdx)     | [subscribeSessionStorage](../api/lynx-api/main-thread/lynx-subscribe-session-storage.mdx)     |
| 取消订阅     | [unsubscribeSessionStorage](../api/lynx-api/lynx/lynx-unsubscribe-session-storage.mdx) | [unsubscribeSessionStorage](../api/lynx-api/main-thread/lynx-unsubscribe-session-storage.mdx) |
