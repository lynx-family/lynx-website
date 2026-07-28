#include "module/native_texture_canvas_view.h"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>

#include "capi/lynx_log_capi.h"

namespace extension {
namespace {

constexpr double kMinBrushSize = 2.0;
constexpr double kMaxBrushSize = 48.0;
constexpr double kMinOpacity = 0.15;
constexpr double kMaxOpacity = 1.0;
constexpr float kMinPointDistance = 1.0f;
constexpr std::uint32_t kBackground = 0xFFF9FAFB;
constexpr std::uint32_t kGrid = 0xFFE3E8EF;
constexpr int kSurfaceBufferCount = 3;

double ClampDouble(double value, double min_value, double max_value) {
  return std::min(std::max(value, min_value), max_value);
}

bool IsPrimaryPointer(native_view_motion_event_t* event) {
  if (!event) {
    return false;
  }
  if (event->device == kNativeDeviceMouse) {
    return (event->buttons & kNativeMouseButtonPrimary) != 0 ||
           event->type == kNativeEventDown || event->type == kNativeEventUp;
  }
  return event->device == kNativeDeviceTouch ||
         event->device == kNativeDeviceStylus ||
         event->device == kNativeDeviceInvertedStylus;
}

bool IsFarEnough(const NativeTexturePoint& previous, float x, float y) {
  const float dx = x - previous.x;
  const float dy = y - previous.y;
  return dx * dx + dy * dy >= kMinPointDistance * kMinPointDistance;
}

std::uint8_t Red(std::uint32_t rgba) {
  return static_cast<std::uint8_t>((rgba >> 16) & 0xFF);
}

std::uint8_t Green(std::uint32_t rgba) {
  return static_cast<std::uint8_t>((rgba >> 8) & 0xFF);
}

std::uint8_t Blue(std::uint32_t rgba) {
  return static_cast<std::uint8_t>(rgba & 0xFF);
}

std::uint32_t BGRA(std::uint8_t r, std::uint8_t g, std::uint8_t b, std::uint8_t a = 0xFF) {
  return static_cast<std::uint32_t>(b) |
         (static_cast<std::uint32_t>(g) << 8) |
         (static_cast<std::uint32_t>(r) << 16) |
         (static_cast<std::uint32_t>(a) << 24);
}

std::uint32_t ParseHexColor(const std::string& color) {
  std::string hex;
  hex.reserve(6);
  for (char ch : color) {
    if (ch != '#' && ch != ' ' && ch != '\t' && ch != '\n' && ch != '\r') {
      hex.push_back(ch);
    }
  }
  if (hex.size() != 6) {
    return BGRA(0x11, 0x18, 0x27);
  }

  unsigned int rgb = 0;
  try {
    rgb = static_cast<unsigned int>(std::stoul(hex, nullptr, 16));
  } catch (...) {
    return BGRA(0x11, 0x18, 0x27);
  }

  return BGRA((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
}

float SurfaceY(float logical_y, int height, float pixel_ratio) {
  return static_cast<float>(height - 1) - logical_y * pixel_ratio;
}

bool IsEmptyRect(const NativeTextureCanvasRect& rect) {
  return rect.width <= 0 || rect.height <= 0;
}

NativeTextureCanvasRect FullRect(int width, int height) {
  return {0, 0, width, height};
}

NativeTextureCanvasRect ClampRect(const NativeTextureCanvasRect& rect,
                                  int width,
                                  int height) {
  if (IsEmptyRect(rect) || width <= 0 || height <= 0) {
    return {};
  }

  const int left = std::max(0, rect.x);
  const int top = std::max(0, rect.y);
  const int right = std::min(width, rect.x + rect.width);
  const int bottom = std::min(height, rect.y + rect.height);
  if (right <= left || bottom <= top) {
    return {};
  }
  return {left, top, right - left, bottom - top};
}

NativeTextureCanvasRect RectFromBounds(float left,
                                       float top,
                                       float right,
                                       float bottom,
                                       int width,
                                       int height) {
  const int x0 = static_cast<int>(std::floor(left));
  const int y0 = static_cast<int>(std::floor(top));
  const int x1 = static_cast<int>(std::ceil(right)) + 1;
  const int y1 = static_cast<int>(std::ceil(bottom)) + 1;
  return ClampRect({x0, y0, x1 - x0, y1 - y0}, width, height);
}

void UnionRect(NativeTextureCanvasRect& target,
               const NativeTextureCanvasRect& rect) {
  if (IsEmptyRect(rect)) {
    return;
  }
  if (IsEmptyRect(target)) {
    target = rect;
    return;
  }

  const int left = std::min(target.x, rect.x);
  const int top = std::min(target.y, rect.y);
  const int right = std::max(target.x + target.width, rect.x + rect.width);
  const int bottom = std::max(target.y + target.height, rect.y + rect.height);
  target = {left, top, right - left, bottom - top};
}

void PaintBackground(std::vector<std::uint32_t>& pixels,
                     int width,
                     int height,
                     float pixel_ratio) {
  pixels.assign(static_cast<size_t>(width) * height, kBackground);
  const int grid_size = std::max(16, static_cast<int>(24 * pixel_ratio));
  for (int x = grid_size; x < width; x += grid_size) {
    for (int y = 0; y < height; y++) {
      pixels[static_cast<size_t>(y) * width + x] = kGrid;
    }
  }
  for (int y = grid_size; y < height; y += grid_size) {
    std::fill(pixels.begin() + static_cast<size_t>(y) * width,
              pixels.begin() + static_cast<size_t>(y) * width + width,
              kGrid);
  }
}

void BlendPixel(std::vector<std::uint32_t>& pixels,
                int width,
                int height,
                int x,
                int y,
                std::uint32_t color,
                double opacity) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  opacity = std::min(std::max(opacity, 0.0), 1.0);
  std::uint32_t& dst = pixels[static_cast<size_t>(y) * width + x];
  const double inv = 1.0 - opacity;
  const std::uint8_t r = static_cast<std::uint8_t>(Red(color) * opacity + Red(dst) * inv);
  const std::uint8_t g = static_cast<std::uint8_t>(Green(color) * opacity + Green(dst) * inv);
  const std::uint8_t b = static_cast<std::uint8_t>(Blue(color) * opacity + Blue(dst) * inv);
  dst = BGRA(r, g, b);
}

void BlendCircle(std::vector<std::uint32_t>& pixels,
                 std::vector<std::uint8_t>& stroke_mask,
                 std::vector<std::uint8_t>& paint_mask,
                 int width,
                 int height,
                 float cx,
                 float cy,
                 float radius,
                 std::uint32_t color,
                 double opacity) {
  const int min_x = static_cast<int>(std::floor(cx - radius));
  const int max_x = static_cast<int>(std::ceil(cx + radius));
  const int min_y = static_cast<int>(std::floor(cy - radius));
  const int max_y = static_cast<int>(std::ceil(cy + radius));
  const float radius_sq = radius * radius;

  for (int y = min_y; y <= max_y; y++) {
    for (int x = min_x; x <= max_x; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        continue;
      }
      const float dx = x + 0.5f - cx;
      const float dy = y + 0.5f - cy;
      if (dx * dx + dy * dy > radius_sq) {
        continue;
      }

      const size_t index = static_cast<size_t>(y) * width + x;
      if (stroke_mask[index] != 0) {
        continue;
      }
      stroke_mask[index] = 1;
      BlendPixel(pixels, width, height, x, y, color, opacity);
      paint_mask[index] = 1;
    }
  }
}

}  // namespace

NativeTextureCanvasView::NativeTextureCanvasView() {
  current_brush_.color = "#111827";
  current_brush_.size = 12;
  current_brush_.opacity = 1;
  NativeTextureCanvasRegistry::Get().TrackView(this);
}

NativeTextureCanvasView::~NativeTextureCanvasView() {
  if (!canvas_id_.empty()) {
    NativeTextureCanvasRegistry::Get().Unregister(canvas_id_, this);
  }
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    DropSurfaceStatesLocked();
  }
  NativeTextureCanvasRegistry::Get().UntrackView(this);
}

void NativeTextureCanvasView::OnAttach() {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    attached_ = true;
  }
  RequestRender();
}

void NativeTextureCanvasView::OnDetach() {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    attached_ = false;
    DropSurfaceStatesLocked();
  }
}

void NativeTextureCanvasView::OnPropertiesChanged(const lynx::pub::LynxValue& attrs,
                                                  const lynx::pub::LynxValue& events) {
  if (!attrs.HasProperty("canvas-id")) {
    return;
  }

  std::string next_id = attrs.GetProperty("canvas-id").StdString();
  if (next_id.empty() || next_id == canvas_id_) {
    return;
  }

  if (!canvas_id_.empty()) {
    NativeTextureCanvasRegistry::Get().Unregister(canvas_id_, this);
  }
  canvas_id_ = next_id;
  NativeTextureCanvasRegistry::Get().Register(canvas_id_, this);
}

void NativeTextureCanvasView::OnLayoutChanged(float left, float top, float width, float height,
                                              float pixel_ratio) {
  bool did_resize = false;
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    const float next_pixel_ratio = pixel_ratio > 0 ? pixel_ratio : 1;
    const int next_width_px = std::max(1, static_cast<int>(std::round(width * next_pixel_ratio)));
    const int next_height_px = std::max(1, static_cast<int>(std::round(height * next_pixel_ratio)));
    if (next_width_px != width_px_ || next_height_px != height_px_ ||
        std::abs(next_pixel_ratio - pixel_ratio_) > 0.001f || !has_canvas_) {
      ResizeCanvasLocked(next_width_px, next_height_px, next_pixel_ratio);
      did_resize = true;
    }
  }
  // A resize allocates fresh platform buffers; repaint every triple-buffer slot
  // before returning to small dirty-rect uploads.
  const int render_count = did_resize ? kSurfaceBufferCount : 1;
  for (int i = 0; i < render_count; i++) {
    RequestRender();
  }
}

void NativeTextureCanvasView::OnMotionEvent(native_view_motion_event_t* event) {
  if (!IsPrimaryPointer(event)) {
    return;
  }

  switch (event->type) {
    case kNativeEventDown:
      RequestFocus();
      BeginStroke(event->x, event->y);
      break;
    case kNativeEventMove:
      AppendStroke(event->x, event->y);
      break;
    case kNativeEventUp:
      AppendStroke(event->x, event->y);
      EndStroke();
      break;
    case kNativeEventCancel:
      EndStroke();
      break;
    default:
      break;
  }
}

void NativeTextureCanvasView::SetBrush(const std::string& color, double size, double opacity) {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    current_brush_.color = color;
    current_brush_.size = ClampDouble(size, kMinBrushSize, kMaxBrushSize);
    current_brush_.opacity = ClampDouble(opacity, kMinOpacity, kMaxOpacity);
  }
}

void NativeTextureCanvasView::Clear() {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    InitializeCanvasLocked();
    drawing_ = false;
    stroke_mask_.clear();
  }
  RequestRender();
}

void NativeTextureCanvasView::BeginStroke(float x, float y) {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    if (!has_canvas_ && width_px_ > 0 && height_px_ > 0) {
      InitializeCanvasLocked();
    }
    active_stroke_ = current_brush_;
    last_point_ = {x, y};
    drawing_ = true;
    stroke_mask_.assign(static_cast<size_t>(width_px_) * height_px_, 0);
    DrawPointLocked(x, y);
  }
  RequestRender();
}

void NativeTextureCanvasView::AppendStroke(float x, float y) {
  bool did_append = false;
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    if (drawing_ && has_canvas_ && IsFarEnough(last_point_, x, y)) {
      DrawLineLocked(last_point_.x, last_point_.y, x, y);
      last_point_ = {x, y};
      did_append = true;
    }
  }
  if (did_append) {
    RequestRender();
  }
}

void NativeTextureCanvasView::EndStroke() {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    drawing_ = false;
    stroke_mask_.clear();
  }
  RequestRender();
}

void NativeTextureCanvasView::InitializeCanvasLocked() {
  if (width_px_ <= 0 || height_px_ <= 0) {
    pixels_.clear();
    paint_mask_.clear();
    has_canvas_ = false;
    return;
  }

  PaintBackground(pixels_, width_px_, height_px_, pixel_ratio_);
  paint_mask_.assign(static_cast<size_t>(width_px_) * height_px_, 0);
  stroke_mask_.clear();
  DropSurfaceStatesLocked();
  has_canvas_ = true;
}

void NativeTextureCanvasView::ResizeCanvasLocked(int width_px, int height_px, float pixel_ratio) {
  if (width_px <= 0 || height_px <= 0) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "ResizeCanvas ignored invalid size old=%dx%d requested=%dx%d",
                  width_px_, height_px_, width_px, height_px);
    width_px_ = 0;
    height_px_ = 0;
    pixel_ratio_ = pixel_ratio > 0 ? pixel_ratio : 1;
    pixels_.clear();
    paint_mask_.clear();
    stroke_mask_.clear();
    DropSurfaceStatesLocked();
    has_canvas_ = false;
    return;
  }

  const int old_width = width_px_;
  const int old_height = height_px_;
  const bool preserve_pixels =
      has_canvas_ && old_width > 0 && old_height > 0 &&
      pixels_.size() >= static_cast<size_t>(old_width) * old_height &&
      paint_mask_.size() >= static_cast<size_t>(old_width) * old_height;
  std::vector<std::uint32_t> old_pixels;
  std::vector<std::uint8_t> old_paint_mask;
  if (preserve_pixels) {
    old_pixels = pixels_;
    old_paint_mask = paint_mask_;
  }

  int copy_width = 0;
  int copy_height = 0;
  int source_y = 0;
  int target_y = 0;

  width_px_ = width_px;
  height_px_ = height_px;
  pixel_ratio_ = pixel_ratio > 0 ? pixel_ratio : 1;
  PaintBackground(pixels_, width_px_, height_px_, pixel_ratio_);
  paint_mask_.assign(static_cast<size_t>(width_px_) * height_px_, 0);

  if (preserve_pixels) {
    copy_width = std::min(old_width, width_px_);
    const int y_offset = height_px_ - old_height;
    source_y = std::max(0, -y_offset);
    target_y = std::max(0, y_offset);
    copy_height = std::min(old_height - source_y, height_px_ - target_y);
    if (copy_width > 0 && copy_height > 0) {
      for (int row = 0; row < copy_height; row++) {
        const size_t old_row_offset = static_cast<size_t>(source_y + row) * old_width;
        const size_t new_row_offset = static_cast<size_t>(target_y + row) * width_px_;
        for (int x = 0; x < copy_width; x++) {
          if (old_paint_mask[old_row_offset + x] == 0) {
            continue;
          }
          pixels_[new_row_offset + x] = old_pixels[old_row_offset + x];
          paint_mask_[new_row_offset + x] = 1;
        }
      }
    }
  }

  stroke_mask_.clear();
  DropSurfaceStatesLocked();
  has_canvas_ = true;
}

void NativeTextureCanvasView::DropSurfaceStatesLocked() {
  for (const auto& entry : surface_states_) {
    EvictNativeTextureCanvasSurfaceCache(entry.first);
  }
  surface_states_.clear();
}

void NativeTextureCanvasView::DrawPointLocked(float x, float y) {
  if (!has_canvas_) {
    return;
  }
  if (stroke_mask_.size() != static_cast<size_t>(width_px_) * height_px_) {
    stroke_mask_.assign(static_cast<size_t>(width_px_) * height_px_, 0);
  }
  if (paint_mask_.size() != static_cast<size_t>(width_px_) * height_px_) {
    paint_mask_.assign(static_cast<size_t>(width_px_) * height_px_, 0);
  }

  const std::uint32_t color = ParseHexColor(active_stroke_.color);
  const float radius = std::max(1.0f, static_cast<float>(active_stroke_.size * pixel_ratio_ * 0.5));
  const double opacity = std::min(std::max(active_stroke_.opacity, 0.0), 1.0);
  const float sx = x * pixel_ratio_;
  const float sy = SurfaceY(y, height_px_, pixel_ratio_);
  MarkDirtyLocked(RectFromBounds(sx - radius, sy - radius, sx + radius, sy + radius,
                                 width_px_, height_px_));
  BlendCircle(pixels_, stroke_mask_, paint_mask_, width_px_, height_px_, sx, sy,
              radius, color, opacity);
}

void NativeTextureCanvasView::DrawLineLocked(float x0, float y0, float x1, float y1) {
  if (!has_canvas_) {
    return;
  }
  if (stroke_mask_.size() != static_cast<size_t>(width_px_) * height_px_) {
    stroke_mask_.assign(static_cast<size_t>(width_px_) * height_px_, 0);
  }
  if (paint_mask_.size() != static_cast<size_t>(width_px_) * height_px_) {
    paint_mask_.assign(static_cast<size_t>(width_px_) * height_px_, 0);
  }

  const std::uint32_t color = ParseHexColor(active_stroke_.color);
  const float radius = std::max(1.0f, static_cast<float>(active_stroke_.size * pixel_ratio_ * 0.5));
  const double opacity = std::min(std::max(active_stroke_.opacity, 0.0), 1.0);
  const float sx0 = x0 * pixel_ratio_;
  const float sy0 = SurfaceY(y0, height_px_, pixel_ratio_);
  const float sx1 = x1 * pixel_ratio_;
  const float sy1 = SurfaceY(y1, height_px_, pixel_ratio_);
  const float dx = sx1 - sx0;
  const float dy = sy1 - sy0;
  const float distance = std::sqrt(dx * dx + dy * dy);
  const int steps = std::max(1, static_cast<int>(std::ceil(distance / std::max(1.0f, radius * 0.5f))));
  MarkDirtyLocked(RectFromBounds(std::min(sx0, sx1) - radius,
                                 std::min(sy0, sy1) - radius,
                                 std::max(sx0, sx1) + radius,
                                 std::max(sy0, sy1) + radius,
                                 width_px_,
                                 height_px_));

  for (int i = 0; i <= steps; i++) {
    const float t = static_cast<float>(i) / static_cast<float>(steps);
    BlendCircle(pixels_, stroke_mask_, paint_mask_, width_px_, height_px_,
                sx0 + dx * t, sy0 + dy * t, radius, color, opacity);
  }
}

void NativeTextureCanvasView::MarkDirtyLocked(const NativeTextureCanvasRect& rect) {
  const NativeTextureCanvasRect clamped = ClampRect(rect, width_px_, height_px_);
  if (IsEmptyRect(clamped)) {
    return;
  }
  for (auto& entry : surface_states_) {
    UnionRect(entry.second.dirty, clamped);
  }
}

void NativeTextureCanvasView::RequestRender() {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    if (render_scheduled_) {
      return;
    }
    render_scheduled_ = true;
  }

  RunScheduledRender();
}

void NativeTextureCanvasView::RunScheduledRender() {
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    render_scheduled_ = false;
  }
  Render();
}

void NativeTextureCanvasView::Render() {
  int width_px = 0;
  int height_px = 0;
  std::uint64_t render_id = 0;
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    if (!attached_ || !has_canvas_ || width_px_ <= 0 || height_px_ <= 0) {
      return;
    }
    width_px = width_px_;
    height_px = height_px_;
    render_id = ++render_id_;
  }

  lynx_surface_handle_t* surface = AcquireSurface(width_px, height_px);
  if (!surface) {
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "AcquireSurface returned null for %dx%d", width_px, height_px);
    return;
  }

  NativeTextureCanvasRect dirty_rect;
  std::vector<std::uint32_t> pixels;
  {
    std::lock_guard<std::mutex> lock(state_mutex_);
    if (!attached_ || !has_canvas_ || width_px != width_px_ || height_px != height_px_) {
      return;
    }

    auto state = surface_states_.find(surface);
    if (state == surface_states_.end()) {
      state = surface_states_.emplace(surface, SurfaceState{}).first;
      dirty_rect = FullRect(width_px_, height_px_);
    } else {
      dirty_rect = ClampRect(state->second.dirty, width_px_, height_px_);
    }

    if (IsEmptyRect(dirty_rect)) {
      return;
    }

    pixels.resize(static_cast<size_t>(dirty_rect.width) * dirty_rect.height);
    const size_t row_bytes = static_cast<size_t>(dirty_rect.width) * sizeof(std::uint32_t);
    for (int row = 0; row < dirty_rect.height; row++) {
      const size_t source_offset =
          static_cast<size_t>(dirty_rect.y + row) * width_px_ + dirty_rect.x;
      std::memcpy(pixels.data() + static_cast<size_t>(row) * dirty_rect.width,
                  pixels_.data() + source_offset,
                  row_bytes);
    }
    state->second.dirty = {};
  }

  auto restore_dirty = [&]() {
    std::lock_guard<std::mutex> lock(state_mutex_);
    if (width_px == width_px_ && height_px == height_px_) {
      UnionRect(surface_states_[surface].dirty, dirty_rect);
    }
  };

  if (!CopyNativeTextureCanvasSurface(surface, width_px, height_px, pixels, dirty_rect)) {
    restore_dirty();
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "Copying native texture surface failed id=%llu surface=%p size=%dx%d dirty=%d,%d %dx%d",
                  static_cast<unsigned long long>(render_id), surface, width_px,
                  height_px, dirty_rect.x, dirty_rect.y, dirty_rect.width,
                  dirty_rect.height);
    return;
  }

  // SwapBack notifies the shared image sink that a new texture frame is
  // available, so the raster path can present without dirtying the Lynx view
  // tree for every stroke sample.
  if (!SwapBack()) {
    restore_dirty();
    LYNX_CAPI_LOG(LYNX_LOG_WARNING, "NativeTextureCanvas",
                  "SwapBack failed id=%llu surface=%p size=%dx%d",
                  static_cast<unsigned long long>(render_id), surface, width_px,
                  height_px);
    return;
  }
}

void NativeTextureCanvasRegistry::Register(const std::string& id, NativeTextureCanvasView* view) {
  PendingBrush pending;
  bool has_pending = false;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    views_[id] = view;
    auto it = pending_brushes_.find(id);
    if (it != pending_brushes_.end()) {
      pending = it->second;
      pending_brushes_.erase(it);
      has_pending = true;
    }
  }
  if (has_pending) {
    view->SetBrush(pending.color, pending.size, pending.opacity);
  }
}

void NativeTextureCanvasRegistry::Unregister(const std::string& id, NativeTextureCanvasView* view) {
  std::lock_guard<std::mutex> lock(mutex_);
  auto it = views_.find(id);
  if (it != views_.end() && it->second == view) {
    views_.erase(it);
  }
}

void NativeTextureCanvasRegistry::TrackView(NativeTextureCanvasView* view) {
  std::lock_guard<std::mutex> lock(mutex_);
  live_views_.insert(view);
}

void NativeTextureCanvasRegistry::UntrackView(NativeTextureCanvasView* view) {
  std::lock_guard<std::mutex> lock(mutex_);
  live_views_.erase(view);
}

bool NativeTextureCanvasRegistry::SetBrush(const std::string& id,
                                           const std::string& color,
                                           double size,
                                           double opacity) {
  NativeTextureCanvasView* view = nullptr;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = views_.find(id);
    if (it == views_.end()) {
      pending_brushes_[id] = {color, size, opacity};
      return true;
    }
    view = it->second;
  }

  view->SetBrush(color, size, opacity);
  return true;
}

bool NativeTextureCanvasRegistry::Clear(const std::string& id) {
  NativeTextureCanvasView* view = nullptr;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = views_.find(id);
    if (it == views_.end()) {
      return false;
    }
    view = it->second;
  }

  view->Clear();
  return true;
}

}  // namespace extension

lynx_native_view_t* native_texture_canvas_create_view(void* opaque) {
  auto* view = new extension::NativeTextureCanvasView();
  return view->native_view();
}
