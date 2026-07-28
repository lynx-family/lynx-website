#include <napi.h>

#include "capi/lynx_extension_module_types_capi.h"
#include "module/native_texture_canvas_module.h"

typedef struct lynx_extension_module_creator_api_t {
  extension_module_creator create_module_func;
} lynx_extension_module_creator_api_t;

napi_value GetModuleCreator(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  auto* creator_api = new lynx_extension_module_creator_api_t{
      .create_module_func = native_texture_canvas_module_create_extension_module,
  };

  auto result = Napi::Object::New(env);
  result.Set("name", Napi::String::New(env, "NativeTextureCanvasModule"));
  result.Set("creatorModuleFunc",
             Napi::External<void>::New(
                 env, creator_api, [](Napi::Env env, void* data) {
                   delete (lynx_extension_module_creator_api_t*)data;
                 }));
  result.Set("isLazyCreate", Napi::Boolean::New(env, false));
  result.Set("opaque", Napi::External<void>::New(env, nullptr));

  return result;
}

napi_value CreateExtensionModule(const Napi::CallbackInfo& info) {
  return GetModuleCreator(info);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("createExtensionModule", Napi::Function::New(env, CreateExtensionModule));
  return exports;
}

NODE_API_MODULE(native_texture_canvas_module, Init)
