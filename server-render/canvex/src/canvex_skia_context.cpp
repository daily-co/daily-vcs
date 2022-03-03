#include "canvex_skia_context.h"
#include "style_util.h"
#include "time_util.h"

namespace canvex {

CanvexContext::CanvexContext(
    std::shared_ptr<SkCanvas> canvas,
    const std::filesystem::path& resPath,
    CanvexSkiaResourceContext& skiaResCtx
  ) : canvas_(canvas),
      resPath_(resPath),
      skiaResCtx_(skiaResCtx) {
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
    std::cerr << "warning: invalid fillStyle arg: " << s << std::endl;
    return;
  }
  //std::cout << " fill style now: " << sf.fillColor[0] << ", " << sf.fillColor[1] << ", "
  //  << sf.fillColor[2] << ", " << sf.fillColor[3] << std::endl;
}

void CanvexContext::setStrokeStyle(const std::string& s) {
  auto& sf = stateStack_.back();
  if (!getRGBAColorFromCSSStyleString(s, sf.strokeColor)) {
    std::cerr << "warning: invalid strokeStyle arg: " << s << std::endl;
    return;
  }
  //std::cout << " stroke style now: " << sf.fillColor[0] << ", " << sf.fillColor[1] << ", "
  //  << sf.fillColor[2] << ", " << sf.fillColor[3] << std::endl;
}

void CanvexContext::setLineWidth(double lineW) {
  auto& sf = stateStack_.back();
  sf.strokeWidth_px = lineW;
}

void CanvexContext::setLineJoin(JoinType t) {
  auto& sf = stateStack_.back();
  sf.strokeJoin = t;
}

void CanvexContext::setFont(const std::string& weight, const std::string& style, double pxSize, const std::string& name) {
  auto& sf = stateStack_.back();

  sf.fontName = name;
  sf.fontSize = pxSize;
  
  sf.fontIsItalic = style == "italic";
  
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
  paint.setAntiAlias(true);

  canvas_->drawRect(SkRect::MakeXYWH(x, y, w, h), paint);
}

void CanvexContext::rect(double x, double y, double w, double h) {
  if (!path_) {
    path_ = std::make_unique<SkPath>();
  }
  path_->addRect(SkRect::MakeXYWH(x, y, w, h));
}

void CanvexContext::strokeRect(double x, double y, double w, double h) {
  const auto& sf = stateStack_.back();
  SkPaint paint;
  paint.setStyle(SkPaint::kStroke_Style);
  paint.setColor(getSkStrokeColor());
  paint.setAntiAlias(true);
  paint.setStrokeWidth(sf.strokeWidth_px);
  paint.setStrokeJoin((SkPaint::Join)sf.strokeJoin);

  canvas_->drawRect(SkRect::MakeXYWH(x, y, w, h), paint);
}

void CanvexContext::fillText(const std::string& text, double x, double y) {
  SkPaint paint;
  paint.setStyle(SkPaint::kFill_Style);
  paint.setColor(getSkFillColor());
  paint.setAntiAlias(true);

  drawTextWithPaint_(text, x, y, paint);
}

void CanvexContext::strokeText(const std::string& text, double x, double y) {
  const auto& sf = stateStack_.back();
  SkPaint paint;
  paint.setStyle(SkPaint::kStroke_Style);
  paint.setColor(getSkStrokeColor());
  paint.setAntiAlias(true);
  paint.setStrokeWidth(sf.strokeWidth_px);
  paint.setStrokeJoin((SkPaint::Join)sf.strokeJoin);

  drawTextWithPaint_(text, x, y, paint);
}

void CanvexContext::drawTextWithPaint_(const std::string& text, double x, double y, const SkPaint& paint) {
  auto& sf = stateStack_.back();

  double t0 = getMonotonicTime();

  std::string fontFamily = (sf.fontName.empty()) ? "Roboto" : sf.fontName;
  auto fontFileNameOpt = skiaResCtx_.getFontFileName(fontFamily, sf.fontWeight, sf.fontIsItalic);
  if (!fontFileNameOpt.has_value()) {
    std::cerr << "** Unable to match font name: " << fontFamily << std::endl;
    return; // --
  }
  std::string fontFileName = fontFileNameOpt.value();

  sk_sp<SkTypeface> typeface = skiaResCtx_.typefaceCache[fontFileName];
  if (!typeface) {
    // the font look-up call is somewhat expensive, so we cache the typeface objects
    if (resPath_.empty()) {
      std::cerr << "Warning: fontResPath is empty, can't load fonts" << std::endl;
    } else {
      // FIXME: hardcoded subpath expects to find all fonts in one dir
      auto fontPath = resPath_ / "fonts" / fontFileName;
      //std::cout << "Loading font at: " << fontPath << std::endl;
      typeface = SkTypeface::MakeFromFile(fontPath.c_str());
      if (!typeface) {
        std::cerr << "** Unable to load font at: " << fontPath << std::endl;
      } else {
        skiaResCtx_.typefaceCache[fontFileName] = typeface;
      }
    }
    /*
    // example of loading a font through the OS font manager API instead.
    // this is unpredictably slow and dependent on fonts being installed, so prefer to use our own embedded fonts.
    typeface = SkTypeface::MakeFromName(
                    "Helvetica",
                    {sf.fontWeight, SkFontStyle::kNormal_Width, SkFontStyle::kUpright_Slant});
    */
  }

  double t_typeface = getMonotonicTime() - t0;
  #pragma unused(t_typeface)
  //std::cout << "time spend on typeface::make: " << t_typeface*1000 << "ms" << std::endl;

  SkFont font(typeface, sf.fontSize);
  auto textBlob = SkTextBlob::MakeFromString(text.c_str(), font);

  canvas_->drawTextBlob(textBlob, x, y, paint);
}

void CanvexContext::drawImage_fromDefaultAssets(const std::string& imageName, double x, double y, double w, double h) {
  if (imageName.empty()) return; // --

  sk_sp<SkImage> image = skiaResCtx_.imageCache_defaultNamespace[imageName];
  if (!image) {
    // FIXME: hardcoded subpath to known test images
    auto assetsPath = resPath_ / "test-assets" / imageName;

    auto data = SkData::MakeFromFileName(assetsPath.c_str());
    if (!data) {
      std::cerr << "drawImage: unable to load path " << assetsPath << std::endl;
      return;
    }
    image = SkImage::MakeFromEncoded(data);
    if (!image) {
      std::cerr << "drawImage: unable to decode image at path " << assetsPath << std::endl;
      return;
    }
    skiaResCtx_.imageCache_defaultNamespace[imageName] = image;
  }

  SkRect rect{(SkScalar)x, (SkScalar)y, (SkScalar)(x + w), (SkScalar)(y + h)};
  SkSamplingOptions sampleOptions(SkFilterMode::kLinear);

  canvas_->drawImageRect(image, rect, sampleOptions);
}

void CanvexContext::beginPath() {
  path_ = std::make_unique<SkPath>();
}

void CanvexContext::closePath() {
  // do we need to write close here?
}

void CanvexContext::moveTo(double x, double y) {
  if (!path_) {
    path_ = std::make_unique<SkPath>();
  }
  path_->moveTo(x, y);
}

void CanvexContext::lineTo(double x, double y) {
  if (!path_) {
    path_ = std::make_unique<SkPath>();
  }
  path_->lineTo(x, y);
}

void CanvexContext::quadraticCurveTo(double cp_x, double cp_y, double x, double y) {
  if (!path_) {
    path_ = std::make_unique<SkPath>();
  }
  path_->quadTo(cp_x, cp_y, x, y);
}

void CanvexContext::clip() {
  if (path_) {
    const bool antialias = true;
    canvas_->clipPath(*path_, antialias);
  }
}

} // namespace canvex
