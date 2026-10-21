---
title: Share Data Across LynxViews
description: Share cached data across LynxViews with SessionStorage, including sharing scope, native setup, and lifecycle management on Android and iOS.
---

# Share Data Across LynxViews

`SessionStorage` lets LynxViews read, write, and observe cached data in a WhiteBoard. Cross-view sharing requires native configuration; the API calls alone do not connect the storage of separate LynxViews.

## Sharing scope

`SessionStorage` is scoped to a shared WhiteBoard, not to the entire application. To share data across LynxViews on Android or iOS, configure them with the **same `LynxGroup` instance when creating the views**. Creating separate groups with the same name or ID does not share their WhiteBoard.

### Android

Enable WhiteBoard explicitly when creating the group; it is disabled by default. Reuse this group for every LynxView that needs to share data:

```java
LynxGroup sharedGroup = new LynxGroup.LynxGroupBuilder()
    .setEnableWhiteBoard(true)
    .build();

LynxView firstView = new LynxView(context,
    new LynxViewBuilder().setLynxGroup(sharedGroup));
LynxView secondView = new LynxView(context,
    new LynxViewBuilder().setLynxGroup(sharedGroup));
```

Keep the shared group alive while these pages need the shared data. Reusing a group without enabling WhiteBoard does not enable cross-view storage sharing.

After all participating LynxViews have been destroyed and the group is no longer needed, call `sharedGroup.destroy()` to release its native WhiteBoard memory. Dropping the Java reference alone does not release this memory. The owner of the group should perform this cleanup once, rather than having each page destroy the shared group when it exits.

### iOS

`LynxGroup` creates its WhiteBoard during initialization. Reuse the same group instance in the builders for all participating LynxViews.

```objc
LynxGroup *sharedGroup = [[LynxGroup alloc] initWithName:@"shared-storage"];

LynxView *firstView = [[LynxView alloc] initWithBuilderBlock:^(LynxViewBuilder *builder) {
  builder.group = sharedGroup;
}];
LynxView *secondView = [[LynxView alloc] initWithBuilderBlock:^(LynxViewBuilder *builder) {
  builder.group = sharedGroup;
}];
```

Without a shared WhiteBoard, each LynxView uses its own storage: a value written in one view cannot be read or observed from another. The same sharing scope applies to `getSessionStorageItem`, `subscribeSessionStorage`, and `unsubscribeSessionStorage`.

## Related APIs

Use the API reference for the thread where your code runs.

| Operation                | Background thread                                                                      | Main thread                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Write data               | [setSessionStorageItem](../api/lynx-api/lynx/lynx-set-session-storage.mdx)             | [setSessionStorageItem](../api/lynx-api/main-thread/lynx-set-session-storage.mdx)             |
| Read data                | [getSessionStorageItem](../api/lynx-api/lynx/lynx-get-session-storage.mdx)             | [getSessionStorageItem](../api/lynx-api/main-thread/lynx-get-session-storage.mdx)             |
| Subscribe to changes     | [subscribeSessionStorage](../api/lynx-api/lynx/lynx-subscribe-session-storage.mdx)     | [subscribeSessionStorage](../api/lynx-api/main-thread/lynx-subscribe-session-storage.mdx)     |
| Unsubscribe from changes | [unsubscribeSessionStorage](../api/lynx-api/lynx/lynx-unsubscribe-session-storage.mdx) | [unsubscribeSessionStorage](../api/lynx-api/main-thread/lynx-unsubscribe-session-storage.mdx) |
