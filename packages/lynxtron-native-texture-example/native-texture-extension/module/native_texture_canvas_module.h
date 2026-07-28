#ifndef EXTENSION_NATIVE_TEXTURE_CANVAS_MODULE_H_
#define EXTENSION_NATIVE_TEXTURE_CANVAS_MODULE_H_

#include <memory>

#include "capi/lynx_export.h"
#include "lynx_extension_module.h"
#include "lynx_view.h"
#include "third_party/weak-node-api/headers/napi.h"

namespace extension {

class NativeTextureCanvasModule : public lynx::pub::LynxExtensionModule {
 public:
  NativeTextureCanvasModule() = default;
  ~NativeTextureCanvasModule() override = default;

  void OnLynxViewCreate(lynx_view_t* lynx_view) override;
  void OnLynxViewDestroy() override;
  void OnRuntimeInit() override;
  void OnRuntimeAttach(
      Napi::Env env,
      std::unique_ptr<lynx::pub::VSyncObserver> vsync_observer) override;
  void OnRuntimeReady(Napi::Env env, Napi::Value lynx, const char* url) override;
  void OnRuntimeDetach() override;
  void OnEnterForeground() override;
  void OnEnterBackground() override;
  void Destroy() override;
};

}  // namespace extension

LYNX_EXTERN_C_BEGIN
LYNX_CAPI_EXPORT lynx_extension_module_t*
native_texture_canvas_module_create_extension_module(void* opaque);
LYNX_EXTERN_C_END

#endif  // EXTENSION_NATIVE_TEXTURE_CANVAS_MODULE_H_
