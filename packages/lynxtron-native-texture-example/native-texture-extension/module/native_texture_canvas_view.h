#ifndef EXTENSION_NATIVE_TEXTURE_CANVAS_VIEW_H_
#define EXTENSION_NATIVE_TEXTURE_CANVAS_VIEW_H_

#include <cstdint>
#include <map>
#include <mutex>
#include <set>
#include <string>
#include <vector>

#include "lynx_extension_module.h"
#include "lynx_native_view.h"

namespace extension {

struct NativeTexturePoint {
  float x = 0;
  float y = 0;
};

struct NativeTextureBrush {
  std::string color = "#111827";
  double size = 12;
  double opacity = 1;
};

struct NativeTextureCanvasRect {
  int x = 0;
  int y = 0;
  int width = 0;
  int height = 0;
};

class NativeTextureCanvasView : public lynx::pub::LynxNativeView {
 public:
  NativeTextureCanvasView();
  ~NativeTextureCanvasView() override;

  bool IsSurfaceEnabled() override { return true; }
  lynx_surface_buffer_mode_t SurfaceBufferMode() override { return kTripleBuffer; }

  void OnAttach() override;
  void OnDetach() override;
  void OnPropertiesChanged(const lynx::pub::LynxValue& attrs,
                           const lynx::pub::LynxValue& events) override;
  void OnLayoutChanged(float left, float top, float width, float height,
                       float pixel_ratio) override;
  void OnMotionEvent(native_view_motion_event_t* event) override;

  void SetBrush(const std::string& color, double size, double opacity);
  void Clear();

 private:
  friend class NativeTextureCanvasRegistry;

  void BeginStroke(float x, float y);
  void AppendStroke(float x, float y);
  void EndStroke();
  void InitializeCanvasLocked();
  void ResizeCanvasLocked(int width_px, int height_px, float pixel_ratio);
  void DropSurfaceStatesLocked();
  void DrawPointLocked(float x, float y);
  void DrawLineLocked(float x0, float y0, float x1, float y1);
  void MarkDirtyLocked(const NativeTextureCanvasRect& rect);
  void RequestRender();
  void RunScheduledRender();
  void Render();

  struct SurfaceState {
    NativeTextureCanvasRect dirty;
  };

  std::string canvas_id_;
  std::vector<std::uint32_t> pixels_;
  std::vector<std::uint8_t> stroke_mask_;
  std::vector<std::uint8_t> paint_mask_;
  std::map<lynx_surface_handle_t*, SurfaceState> surface_states_;
  NativeTextureBrush current_brush_;
  NativeTextureBrush active_stroke_;
  NativeTexturePoint last_point_;
  bool drawing_ = false;
  bool has_canvas_ = false;
  bool attached_ = false;
  int width_px_ = 0;
  int height_px_ = 0;
  float pixel_ratio_ = 1;
  bool render_scheduled_ = false;
  std::uint64_t render_id_ = 0;
  std::mutex state_mutex_;
};

bool CopyNativeTextureCanvasSurface(
    lynx_surface_handle_t* handle,
    int width_px,
    int height_px,
    const std::vector<std::uint32_t>& pixels,
    const NativeTextureCanvasRect& dirty_rect);
void EvictNativeTextureCanvasSurfaceCache(lynx_surface_handle_t* handle);

class NativeTextureCanvasRegistry {
 public:
  static NativeTextureCanvasRegistry& Get() {
    static NativeTextureCanvasRegistry instance;
    return instance;
  }

  void Register(const std::string& id, NativeTextureCanvasView* view);
  void Unregister(const std::string& id, NativeTextureCanvasView* view);
  void TrackView(NativeTextureCanvasView* view);
  void UntrackView(NativeTextureCanvasView* view);
  bool SetBrush(const std::string& id, const std::string& color, double size, double opacity);
  bool Clear(const std::string& id);

 private:
  struct PendingBrush {
    std::string color = "#111827";
    double size = 12;
    double opacity = 1;
  };

  std::map<std::string, NativeTextureCanvasView*> views_;
  std::map<std::string, PendingBrush> pending_brushes_;
  std::set<NativeTextureCanvasView*> live_views_;
  std::mutex mutex_;
};

}  // namespace extension

LYNX_EXTERN_C_BEGIN
lynx_native_view_t* native_texture_canvas_create_view(void* opaque);
LYNX_EXTERN_C_END

#endif  // EXTENSION_NATIVE_TEXTURE_CANVAS_VIEW_H_
