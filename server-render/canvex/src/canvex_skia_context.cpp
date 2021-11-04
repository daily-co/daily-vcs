#include "canvex_skia_context.h"
#include "style_util.h"
#include "time_util.h"

namespace canvex {

CanvexContext::CanvexContext(std::shared_ptr<SkCanvas> canvas) : canvas_(canvas) {
  // init stack with state defaults
  stateStack_.push_back({});
}

void CanvexContext::save() {
  canvas_->save();
  stateStack_.emplace_back(stateStack_.back());
}

void CanvexContext::restore() {
  if (stateStack_.size() == 1) {
    std::cerr << "** warning: canvas context stack underflow in restore()" << std::endl;
    return;
  }
  canvas_->restore();
  stateStack_.pop_back();
}

void CanvexContext::rotate(double radians) {
  canvas_->rotate(radians * (180.0 / M_PI));
}

void CanvexContext::setFillStyle(const std::string& s) {
  auto& sf = stateStack_.back();
  if (!getRGBAColorFromCSSStyleString(s, sf.fillColor)) {
    std::cerr << "warning: invalid CSS color arg: " << s << std::endl;
    return;
  }
  //std::cout << " fill style now: " << sf.fillColor[0] << ", " << sf.fillColor[1] << ", "
  //  << sf.fillColor[2] << ", " << sf.fillColor[3] << std::endl;
}

void CanvexContext::setFont(const std::string& weight, const std::string& /*style*/, double pxSize, const std::string& /*name*/) {
  auto& sf = stateStack_.back();

  // TODO: handle remaining font props style + name

  sf.fontSize = pxSize;
  
  if (!weight.empty()) {
    auto w = strtol(weight.c_str(), nullptr, 10);
    if (w > 0) {
      sf.fontWeight = w;
    }
  }
}

void CanvexContext::fillRect(double x, double y, double w, double h) {
  SkPaint paint;
  paint.setStyle(SkPaint::kFill_Style);
  paint.setColor(getSkFillColor());

  canvas_->drawRect(SkRect::MakeXYWH(x, y, w, h), paint);
}

void CanvexContext::fillText(const std::string& text, double x, double y) {
  auto& sf = stateStack_.back();

  SkPaint paint;
  paint.setStyle(SkPaint::kFill_Style);
  paint.setColor(getSkFillColor());

  double t0 = getMonotonicTime();

  // FIXME: only Helvetica supported for rendering text
  sk_sp<SkTypeface> typeface = typefaceCache_HelveticaByWeight_[sf.fontWeight];
  if (!typeface) {
    // this font look-up call is somewhat expensive, so we cache the typeface objects
    typeface = SkTypeface::MakeFromName(
                    "Helvetica",
                    {sf.fontWeight, SkFontStyle::kNormal_Width, SkFontStyle::kUpright_Slant});
    
    typefaceCache_HelveticaByWeight_[sf.fontWeight] = typeface;
  }

  double t_typeface = getMonotonicTime() - t0;
  #pragma unused(t_typeface)
  //std::cout << "time spend on typeface::make: " << t_typeface*1000 << "ms" << std::endl;

  SkFont font(typeface, sf.fontSize);
  auto textBlob = SkTextBlob::MakeFromString(text.c_str(), font);

  canvas_->drawTextBlob(textBlob, x, y, paint);
}
  
} // namespace canvex
