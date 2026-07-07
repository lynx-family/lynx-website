---
title: LynxEnv
tag: Desktop
overview: true
overviewHeaders: [2]
---

# LynxEnv

`LynxEnv` 是 Desktop public API 的进程级环境入口，负责暴露 SDK 信息、DevTool 开关、LogBox 开关，以及 Native Module / Extension Module 的注册能力。

## Desktop (C++)

```cpp
lynx::pub::LynxEnv& env = lynx::pub::LynxEnv::GetInstance();
const char* version = env.GetVersion();
env.SetDevtoolAppInfo("app_id", "demo");
env.SetDevtoolEnabled(true);
bool devtool_enabled = env.IsDevtoolEnabled();
bool connected = env.ConnectDevtool("ws://127.0.0.1:9229");
env.SetLogboxEnabled(true);
bool logbox_enabled = env.IsLogboxEnabled();
env.RegisterNativeModule("DemoModule", creator, opaque);
env.RegisterExtensionModule("DemoExtension", extension_creator, true, opaque);
```
