#include "module/native_texture_canvas_view.h"

#import <IOSurface/IOSurface.h>

#include <algorithm>
#include <cstdint>
#include <cstring>

namespace extension {
namespace {

IOSurfaceRef GetIOSurfaceFromHandle(lynx_surface_handle_t* handle) {
  if (!handle) {
    return nullptr;
  }
  return reinterpret_cast<IOSurfaceRef>(handle);
}

}  // namespace

bool CopyNativeTextureCanvasSurface(
    lynx_surface_handle_t* handle,
    int width_px,
    int height_px,
    const std::vector<std::uint32_t>& pixels,
    const NativeTextureCanvasRect& dirty_rect) {
  IOSurfaceRef surface = GetIOSurfaceFromHandle(handle);
  if (!surface) {
    return false;
  }

  if (width_px <= 0 || height_px <= 0 || dirty_rect.x < 0 || dirty_rect.y < 0 ||
      dirty_rect.x >= width_px || dirty_rect.y >= height_px ||
      dirty_rect.width <= 0 || dirty_rect.height <= 0 ||
      pixels.size() < static_cast<size_t>(dirty_rect.width) * dirty_rect.height) {
    return false;
  }

  uint32_t seed = 0;
  if (IOSurfaceLock(surface, 0, &seed) != kIOReturnSuccess) {
    return false;
  }

  void* base = IOSurfaceGetBaseAddress(surface);
  size_t bytes_per_row = IOSurfaceGetBytesPerRow(surface);
  if (!base || bytes_per_row == 0) {
    IOSurfaceUnlock(surface, 0, &seed);
    return false;
  }

  const int surface_width = static_cast<int>(IOSurfaceGetWidth(surface));
  const int surface_height = static_cast<int>(IOSurfaceGetHeight(surface));
  if (surface_width != width_px || surface_height != height_px) {
    IOSurfaceUnlock(surface, 0, &seed);
    return false;
  }

  const int copy_width =
      std::min(dirty_rect.width, std::min(width_px, surface_width) - dirty_rect.x);
  const int copy_height =
      std::min(dirty_rect.height, std::min(height_px, surface_height) - dirty_rect.y);
  if (copy_width <= 0 || copy_height <= 0) {
    IOSurfaceUnlock(surface, 0, &seed);
    return false;
  }

  auto* destination = static_cast<std::uint8_t*>(base);
  const auto* source = reinterpret_cast<const std::uint8_t*>(pixels.data());
  const size_t source_bytes_per_row =
      static_cast<size_t>(dirty_rect.width) * sizeof(std::uint32_t);
  const size_t copy_bytes_per_row = static_cast<size_t>(copy_width) * sizeof(std::uint32_t);

  for (int y = 0; y < copy_height; y++) {
    std::memcpy(destination +
                    static_cast<size_t>(dirty_rect.y + y) * bytes_per_row +
                    static_cast<size_t>(dirty_rect.x) * sizeof(std::uint32_t),
                source + static_cast<size_t>(y) * source_bytes_per_row,
                copy_bytes_per_row);
  }

  IOSurfaceUnlock(surface, 0, &seed);
  return true;
}

void EvictNativeTextureCanvasSurfaceCache(lynx_surface_handle_t* handle) {
  (void)handle;
}

}  // namespace extension
