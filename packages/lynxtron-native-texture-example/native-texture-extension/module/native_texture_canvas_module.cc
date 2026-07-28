#include "module/native_texture_canvas_module.h"

#include <cstring>
#include <utility>
#include <vector>

#include "capi/lynx_log_capi.h"
#include "module/native_texture_canvas_view.h"

namespace extension {
namespace {

const uint64_t kNativeTextureCanvasModuleID =
    reinterpret_cast<uint64_t>(&kNativeTextureCanvasModuleID);

Napi::Value SetBrush(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 4) {
    Napi::TypeError::New(
        env, "Expected (string canvasId, string color, number size, number opacity)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "canvasId and color must be strings")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string canvas_id = info[0].As<Napi::String>().Utf8Value();
  std::string color = info[1].As<Napi::String>().Utf8Value();
  double size = info[2].As<Napi::Number>().DoubleValue();
  double opacity = info[3].As<Napi::Number>().DoubleValue();

  bool success =
      NativeTextureCanvasRegistry::Get().SetBrush(canvas_id, color, size, opacity);
  return Napi::Boolean::New(env, success);
}

Napi::Value Clear(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected (string canvasId)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string canvas_id = info[0].As<Napi::String>().Utf8Value();
  bool success = NativeTextureCanvasRegistry::Get().Clear(canvas_id);
  return Napi::Boolean::New(env, success);
}

Napi::Value NativeTextureCanvasModuleMethodsBinder(
    Napi::Env env, Napi::Value exports, const char* module_name,
    NativeTextureCanvasModule& module) {
  if (!exports.IsObject()) {
    return exports;
  }
  Napi::Object exports_obj = exports.As<Napi::Object>();
  exports_obj.Set("setBrush", Napi::Function::New(env, SetBrush, "setBrush"));
  exports_obj.Set("clear", Napi::Function::New(env, Clear, "clear"));
  return exports;
}

}  // namespace

void NativeTextureCanvasModule::OnLynxViewCreate(lynx_view_t* lynx_view) {
  lynx_view_register_native_view(lynx_view, "native-texture-canvas",
                                 &native_texture_canvas_create_view, lynx_view);
}

void NativeTextureCanvasModule::OnLynxViewDestroy() {}
void NativeTextureCanvasModule::OnRuntimeInit() {}

void NativeTextureCanvasModule::OnRuntimeAttach(
    Napi::Env env,
    std::unique_ptr<lynx::pub::VSyncObserver> vsync_observer) {
  SetNapiInstanceData(
      env, kNativeTextureCanvasModuleID, this,
      [](Napi::Env, void*, void*) {}, nullptr);
}

void NativeTextureCanvasModule::OnRuntimeReady(Napi::Env env,
                                               Napi::Value lynx,
                                               const char* url) {}
void NativeTextureCanvasModule::OnRuntimeDetach() {}
void NativeTextureCanvasModule::OnEnterForeground() {}
void NativeTextureCanvasModule::OnEnterBackground() {}
void NativeTextureCanvasModule::Destroy() {}

}  // namespace extension

LYNX_EXTERN_C lynx_extension_module_t*
native_texture_canvas_module_create_extension_module(void* opaque) {
  auto* module = new extension::NativeTextureCanvasModule();
  lynx_extension_module_t* c_module =
      lynx_extension_module_create_with_finalizer(
          module, [](lynx_extension_module_t* m, void* user_data) {
            if (user_data) {
              delete reinterpret_cast<extension::NativeTextureCanvasModule*>(
                  user_data);
            }
          });

  module->SetCModule(c_module);
  module->SetNapiModuleCreator(&extension::NativeTextureCanvasModuleMethodsBinder);
  return c_module;
}
