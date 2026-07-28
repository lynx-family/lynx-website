#include "module/native_texture_canvas_view.h"

#ifdef _WIN32

#ifndef NOMINMAX
#define NOMINMAX
#endif

#include <algorithm>
#include <cstdint>
#include <cstring>
#include <map>
#include <mutex>
#include <vector>

#include <d3d11_1.h>
#include <dxgi.h>
#include <wrl/client.h>

#include "capi/lynx_log_capi.h"

namespace extension {
namespace {

using Microsoft::WRL::ComPtr;

constexpr DWORD kKeyedMutexTimeoutMs = 2000;

struct CachedSurface {
  ComPtr<ID3D11Texture2D> texture;
  D3D11_TEXTURE2D_DESC texture_desc{};
  ComPtr<ID3D11Texture2D> staging_texture;
  D3D11_TEXTURE2D_DESC staging_desc{};
};

std::mutex& SurfaceCacheMutex() {
  static std::mutex mutex;
  return mutex;
}

std::map<HANDLE, CachedSurface>& SurfaceCache() {
  static std::map<HANDLE, CachedSurface> cache;
  return cache;
}

bool IsSupportedFormat(DXGI_FORMAT format) {
  return format == DXGI_FORMAT_B8G8R8A8_UNORM ||
         format == DXGI_FORMAT_B8G8R8A8_UNORM_SRGB ||
         format == DXGI_FORMAT_R8G8B8A8_UNORM ||
         format == DXGI_FORMAT_R8G8B8A8_UNORM_SRGB;
}

bool CreateCanvasD3DDevice(ID3D11Device** device,
                           ID3D11DeviceContext** context) {
  if (!device || !context) {
    return false;
  }

  *device = nullptr;
  *context = nullptr;

  static std::mutex mutex;
  static ComPtr<ID3D11Device> cached_device;
  static ComPtr<ID3D11DeviceContext> cached_context;

  std::lock_guard<std::mutex> lock(mutex);
  if (!cached_device || !cached_context) {
    const D3D_FEATURE_LEVEL feature_levels[] = {
        D3D_FEATURE_LEVEL_11_1,
        D3D_FEATURE_LEVEL_11_0,
        D3D_FEATURE_LEVEL_10_1,
        D3D_FEATURE_LEVEL_10_0,
    };
    constexpr UINT feature_level_count =
        sizeof(feature_levels) / sizeof(feature_levels[0]);
    constexpr UINT create_flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;

    ComPtr<ID3D11Device> new_device;
    ComPtr<ID3D11DeviceContext> new_context;
    HRESULT hr = D3D11CreateDevice(nullptr,
                                   D3D_DRIVER_TYPE_HARDWARE,
                                   nullptr,
                                   create_flags,
                                   feature_levels,
                                   feature_level_count,
                                   D3D11_SDK_VERSION,
                                   &new_device,
                                   nullptr,
                                   &new_context);
    if (FAILED(hr)) {
      hr = D3D11CreateDevice(nullptr,
                             D3D_DRIVER_TYPE_WARP,
                             nullptr,
                             create_flags,
                             feature_levels,
                             feature_level_count,
                             D3D11_SDK_VERSION,
                             &new_device,
                             nullptr,
                             &new_context);
    }
    if (FAILED(hr) || !new_device || !new_context) {
      return false;
    }

    cached_device = new_device;
    cached_context = new_context;
  }

  return SUCCEEDED(cached_device.CopyTo(device)) &&
         SUCCEEDED(cached_context.CopyTo(context)) && *device && *context;
}

bool OpenSharedTexture(ID3D11Device* device,
                       HANDLE shared_handle,
                       ID3D11Texture2D** texture) {
  if (!device || !shared_handle || !texture) {
    return false;
  }

  *texture = nullptr;
  HRESULT hr = device->OpenSharedResource(
      shared_handle, __uuidof(ID3D11Texture2D),
      reinterpret_cast<void**>(texture));
  if (SUCCEEDED(hr) && *texture) {
    return true;
  }

  *texture = nullptr;
  ComPtr<ID3D11Device1> device1;
  hr = device->QueryInterface(__uuidof(ID3D11Device1),
                              reinterpret_cast<void**>(device1.GetAddressOf()));
  if (FAILED(hr) || !device1) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "QueryInterface(ID3D11Device1) failed handle=%p hr=0x%08lx",
                  shared_handle, static_cast<unsigned long>(hr));
    return false;
  }

  hr = device1->OpenSharedResource1(shared_handle,
                                    __uuidof(ID3D11Texture2D),
                                    reinterpret_cast<void**>(texture));
  if (FAILED(hr) || !*texture) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "OpenSharedResource1 failed handle=%p hr=0x%08lx",
                  shared_handle, static_cast<unsigned long>(hr));
  }
  return SUCCEEDED(hr) && *texture;
}

bool GetCachedSharedTexture(ID3D11Device* device,
                            HANDLE shared_handle,
                            int expected_width,
                            int expected_height,
                            ID3D11Texture2D** texture,
                            D3D11_TEXTURE2D_DESC* desc) {
  if (!device || !shared_handle || !texture || !desc) {
    return false;
  }

  *texture = nullptr;
  *desc = {};

  std::lock_guard<std::mutex> lock(SurfaceCacheMutex());
  CachedSurface& cached = SurfaceCache()[shared_handle];
  if (cached.texture &&
      (static_cast<int>(cached.texture_desc.Width) != expected_width ||
       static_cast<int>(cached.texture_desc.Height) != expected_height)) {
    cached.texture.Reset();
    cached.texture_desc = {};
    cached.staging_texture.Reset();
    cached.staging_desc = {};
  }

  if (!cached.texture) {
    ComPtr<ID3D11Texture2D> opened_texture;
    if (!OpenSharedTexture(device, shared_handle, &opened_texture)) {
      LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                    "Open cached shared texture failed handle=%p expected=%dx%d",
                    shared_handle, expected_width, expected_height);
      SurfaceCache().erase(shared_handle);
      return false;
    }
    opened_texture->GetDesc(&cached.texture_desc);
    cached.texture = opened_texture;
    cached.staging_texture.Reset();
    cached.staging_desc = {};
  }

  if (FAILED(cached.texture.CopyTo(texture)) || !*texture) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "Copy cached texture failed handle=%p", shared_handle);
    SurfaceCache().erase(shared_handle);
    return false;
  }
  *desc = cached.texture_desc;
  return true;
}

bool TryAcquireKeyedMutex(ID3D11Texture2D* texture,
                          IDXGIKeyedMutex** keyed_mutex) {
  if (!texture || !keyed_mutex) {
    return false;
  }

  *keyed_mutex = nullptr;
  ComPtr<IDXGIKeyedMutex> mutex;
  HRESULT hr = texture->QueryInterface(__uuidof(IDXGIKeyedMutex),
                                       reinterpret_cast<void**>(
                                           mutex.GetAddressOf()));
  if (FAILED(hr) || !mutex) {
    return true;
  }

  hr = mutex->AcquireSync(0, kKeyedMutexTimeoutMs);
  if (FAILED(hr)) {
    return false;
  }

  hr = mutex.CopyTo(keyed_mutex);
  if (FAILED(hr)) {
    mutex->ReleaseSync(0);
    return false;
  }
  return true;
}

void CopyRows(void* destination,
              UINT destination_row_pitch,
              DXGI_FORMAT destination_format,
              const std::vector<std::uint32_t>& pixels,
              int source_width,
              int copy_width,
              int copy_height) {
  auto* dst = static_cast<std::uint8_t*>(destination);
  const auto* src = reinterpret_cast<const std::uint8_t*>(pixels.data());
  const size_t source_row_bytes =
      static_cast<size_t>(source_width) * sizeof(std::uint32_t);
  const size_t copy_row_bytes =
      static_cast<size_t>(copy_width) * sizeof(std::uint32_t);

  if (destination_format == DXGI_FORMAT_B8G8R8A8_UNORM ||
      destination_format == DXGI_FORMAT_B8G8R8A8_UNORM_SRGB) {
    for (int y = 0; y < copy_height; y++) {
      std::memcpy(dst + static_cast<size_t>(y) * destination_row_pitch,
                  src + static_cast<size_t>(y) * source_row_bytes,
                  copy_row_bytes);
    }
    return;
  }

  for (int y = 0; y < copy_height; y++) {
    const auto* source_row = src + static_cast<size_t>(y) * source_row_bytes;
    auto* destination_row = dst + static_cast<size_t>(y) * destination_row_pitch;
    for (int x = 0; x < copy_width; x++) {
      const auto* source_pixel = source_row + static_cast<size_t>(x) * 4;
      auto* destination_pixel = destination_row + static_cast<size_t>(x) * 4;
      destination_pixel[0] = source_pixel[2];
      destination_pixel[1] = source_pixel[1];
      destination_pixel[2] = source_pixel[0];
      destination_pixel[3] = source_pixel[3];
    }
  }
}

bool SameStagingDesc(const D3D11_TEXTURE2D_DESC& lhs,
                     const D3D11_TEXTURE2D_DESC& rhs) {
  return lhs.Width == rhs.Width && lhs.Height == rhs.Height &&
         lhs.MipLevels == rhs.MipLevels && lhs.ArraySize == rhs.ArraySize &&
         lhs.Format == rhs.Format && lhs.SampleDesc.Count == rhs.SampleDesc.Count &&
         lhs.SampleDesc.Quality == rhs.SampleDesc.Quality &&
         lhs.Usage == rhs.Usage && lhs.BindFlags == rhs.BindFlags &&
         lhs.CPUAccessFlags == rhs.CPUAccessFlags && lhs.MiscFlags == rhs.MiscFlags;
}

bool GetCachedStagingTexture(ID3D11Device* device,
                             HANDLE shared_handle,
                             const D3D11_TEXTURE2D_DESC& texture_desc,
                             ID3D11Texture2D** staging_texture) {
  if (!device || !shared_handle || !staging_texture) {
    return false;
  }

  *staging_texture = nullptr;

  D3D11_TEXTURE2D_DESC staging_desc = texture_desc;
  staging_desc.Usage = D3D11_USAGE_STAGING;
  staging_desc.BindFlags = 0;
  staging_desc.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;
  staging_desc.MiscFlags = 0;

  std::lock_guard<std::mutex> lock(SurfaceCacheMutex());
  auto cached = SurfaceCache().find(shared_handle);
  if (cached == SurfaceCache().end()) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "Staging cache missing handle=%p texture=%ux%u",
                  shared_handle, texture_desc.Width, texture_desc.Height);
    return false;
  }

  if (!cached->second.staging_texture ||
      !SameStagingDesc(cached->second.staging_desc, staging_desc)) {
    ComPtr<ID3D11Texture2D> new_staging_texture;
    HRESULT hr = device->CreateTexture2D(
        &staging_desc, nullptr, &new_staging_texture);
    if (FAILED(hr) || !new_staging_texture) {
      LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                    "Create staging texture failed handle=%p desc=%ux%u format=%d hr=0x%08lx",
                    shared_handle, staging_desc.Width, staging_desc.Height,
                    static_cast<int>(staging_desc.Format),
                    static_cast<unsigned long>(hr));
      cached->second.staging_texture.Reset();
      cached->second.staging_desc = {};
      return false;
    }
    cached->second.staging_texture = new_staging_texture;
    cached->second.staging_desc = staging_desc;
  }

  return SUCCEEDED(cached->second.staging_texture.CopyTo(staging_texture)) &&
         *staging_texture;
}

bool CopyPixelsToTexture(ID3D11Device* device,
                         HANDLE shared_handle,
                         ID3D11DeviceContext* context,
                         ID3D11Texture2D* texture,
                         const D3D11_TEXTURE2D_DESC& texture_desc,
                         int width_px,
                         int height_px,
                         const std::vector<std::uint32_t>& pixels,
                         const NativeTextureCanvasRect& dirty_rect) {
  if (dirty_rect.x < 0 || dirty_rect.y < 0 ||
      dirty_rect.x >= width_px || dirty_rect.y >= height_px) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "CopyPixelsToTexture invalid dirty origin size=%dx%d dirty=%d,%d %dx%d texture=%ux%u",
                  width_px, height_px, dirty_rect.x, dirty_rect.y,
                  dirty_rect.width, dirty_rect.height, texture_desc.Width,
                  texture_desc.Height);
    return false;
  }

  const int copy_width = std::min(
      dirty_rect.width,
      std::min(width_px, static_cast<int>(texture_desc.Width)) - dirty_rect.x);
  const int copy_height = std::min(
      dirty_rect.height,
      std::min(height_px, static_cast<int>(texture_desc.Height)) - dirty_rect.y);
  if (copy_width <= 0 || copy_height <= 0) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "CopyPixelsToTexture empty copy size=%dx%d dirty=%d,%d %dx%d texture=%ux%u",
                  width_px, height_px, dirty_rect.x, dirty_rect.y,
                  dirty_rect.width, dirty_rect.height, texture_desc.Width,
                  texture_desc.Height);
    return false;
  }
  if (pixels.size() <
      static_cast<size_t>(dirty_rect.width) * dirty_rect.height) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "CopyPixelsToTexture pixel buffer too small got=%llu expected=%llu dirty=%dx%d",
                  static_cast<unsigned long long>(pixels.size()),
                  static_cast<unsigned long long>(
                      static_cast<size_t>(dirty_rect.width) * dirty_rect.height),
                  dirty_rect.width, dirty_rect.height);
    return false;
  }

  ComPtr<ID3D11Texture2D> staging_texture;
  if (!GetCachedStagingTexture(device,
                               shared_handle,
                               texture_desc,
                               &staging_texture)) {
    return false;
  }

  D3D11_MAPPED_SUBRESOURCE mapped{};
  HRESULT hr = context->Map(staging_texture.Get(), 0, D3D11_MAP_WRITE, 0, &mapped);
  if (FAILED(hr)) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "Map staging texture failed handle=%p desc=%ux%u hr=0x%08lx",
                  shared_handle, texture_desc.Width, texture_desc.Height,
                  static_cast<unsigned long>(hr));
    return false;
  }

  CopyRows(mapped.pData,
           mapped.RowPitch,
           texture_desc.Format,
           pixels,
           dirty_rect.width,
           copy_width,
           copy_height);
  context->Unmap(staging_texture.Get(), 0);

  D3D11_BOX source_box{};
  source_box.left = 0;
  source_box.top = 0;
  source_box.front = 0;
  source_box.right = static_cast<UINT>(copy_width);
  source_box.bottom = static_cast<UINT>(copy_height);
  source_box.back = 1;

  context->CopySubresourceRegion(texture,
                                 0,
                                 static_cast<UINT>(dirty_rect.x),
                                 static_cast<UINT>(dirty_rect.y),
                                 0,
                                 staging_texture.Get(),
                                 0,
                                 &source_box);
  context->Flush();
  return true;
}

}  // namespace

bool CopyNativeTextureCanvasSurface(
    lynx_surface_handle_t* handle,
    int width_px,
    int height_px,
    const std::vector<std::uint32_t>& pixels,
    const NativeTextureCanvasRect& dirty_rect) {
  if (!handle || width_px <= 0 || height_px <= 0 ||
      dirty_rect.width <= 0 || dirty_rect.height <= 0 ||
      pixels.size() < static_cast<size_t>(dirty_rect.width) * dirty_rect.height) {
    return false;
  }

  ComPtr<ID3D11Device> device;
  ComPtr<ID3D11DeviceContext> context;
  if (!CreateCanvasD3DDevice(&device, &context)) {
    return false;
  }

  ComPtr<ID3D11Texture2D> texture;
  D3D11_TEXTURE2D_DESC desc{};
  HANDLE shared_handle = reinterpret_cast<HANDLE>(handle);
  if (!GetCachedSharedTexture(device.Get(), shared_handle, width_px, height_px, &texture, &desc)) {
    return false;
  }

  if (static_cast<int>(desc.Width) != width_px ||
      static_cast<int>(desc.Height) != height_px ||
      !IsSupportedFormat(desc.Format) ||
      desc.SampleDesc.Count != 1) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "Shared texture desc rejected handle=%p requested=%dx%d desc=%ux%u format=%d samples=%u",
                  shared_handle, width_px, height_px, desc.Width, desc.Height,
                  static_cast<int>(desc.Format), desc.SampleDesc.Count);
    return false;
  }

  ComPtr<IDXGIKeyedMutex> keyed_mutex;
  if (!TryAcquireKeyedMutex(texture.Get(), &keyed_mutex)) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "Acquire keyed mutex failed handle=%p requested=%dx%d desc=%ux%u",
                  shared_handle, width_px, height_px, desc.Width, desc.Height);
    return false;
  }

  const bool copied = CopyPixelsToTexture(device.Get(),
                                          shared_handle,
                                          context.Get(),
                                          texture.Get(),
                                          desc,
                                          width_px,
                                          height_px,
                                          pixels,
                                          dirty_rect);

  if (keyed_mutex) {
    keyed_mutex->ReleaseSync(0);
  }
  return copied;
}

void EvictNativeTextureCanvasSurfaceCache(lynx_surface_handle_t* handle) {
  if (!handle) {
    return;
  }

  std::lock_guard<std::mutex> lock(SurfaceCacheMutex());
  SurfaceCache().erase(reinterpret_cast<HANDLE>(handle));
}

}  // namespace extension

#endif  // _WIN32
