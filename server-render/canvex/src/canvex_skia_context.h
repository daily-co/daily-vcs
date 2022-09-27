#pragma once
#include "skia_includes.h"
#include <filesystem>
#include <iostream>
#include <unordered_map>
#include "canvex_skia_resource_context.h"

/*
 Implements a basic HTML-style canvas 2D context around Skia.
*/

namespace canvex {

enum JoinType {
  MITER = SkPaint::kMiter_Join,
  BEVEL = SkPaint::kBevel_Join,
  ROUND = SkPaint::kRound_Join,
};

enum ImageSourceType {
  DefaultAsset,
  CompositionAsset,
  LiveAsset,
};

struct DrawImageStats {
  bool wasCacheMiss;
  double timeSpent_imageLoad_s;
  double timeSpent_skiaDraw_s;
};

// The canvas API has state that can be saved but is not part of Skia's save/restore.
// This frame object tracks that extra state.
struct CanvexContextStateFrame {
  float globalAlpha = 1.0;

  float fillColor[4] = {0, 0, 0, 0}; // RGBA

  float strokeColor[4] = {0, 0, 0, 0};
  float strokeWidth_px = 1.0;
  JoinType strokeJoin = MITER;

  double fontSize = 12;
  int fontWeight = 400;
  std::string fontName;
  bool fontIsItalic;  // only supported value for fontStyle
};

class CanvexContext {
 public:
  CanvexContext(
    std::shared_ptr<SkCanvas> canvas,
    const std::filesystem::path& resPath,
    CanvexSkiaResourceContext& skiaResCtx);

  void save();
  void restore();
  void rotate(double radians);

  void setFillStyle(const std::string& s);
  void setStrokeStyle(const std::string& s);
  void setLineWidth(double lineW);
  void setLineJoin(JoinType t);
  void setGlobalAlpha(double a);
  void setFont(const std::string& weight, const std::string& style, double pxSize, const std::string& name);

  void fillRect(double x, double y, double w, double h);
  void strokeRect(double x, double y, double w, double h);
  void rect(double x, double y, double w, double h);
  void fillText(const std::string& text, double x, double y);
  void strokeText(const std::string& text, double x, double y);

  void drawImage(ImageSourceType type, const std::string& imageName,
          double x, double y, double w, double h,
          DrawImageStats* stats);

  void drawImageWithSrcCoords(ImageSourceType type, const std::string& imageName,
          double dstX, double dstY, double dstW, double dstH,
          double srcX, double srcY, double srcW, double srcH,
          DrawImageStats* stats);

  // commands that operate on current path
  void beginPath();
  void closePath();
  void moveTo(double x, double y);
  void lineTo(double x, double y);
  void quadraticCurveTo(double cp_x, double cp_y, double x, double y);
  void clip();
  void fill();
  void stroke();

 private:
  // external rendering target and configuration
  std::shared_ptr<SkCanvas> canvas_;
  std::filesystem::path resPath_;

  // internal state
  std::unique_ptr<SkPath> path_;
  std::vector<CanvexContextStateFrame> stateStack_;

  // cached resources
  CanvexSkiaResourceContext& skiaResCtx_;

  // returns null if image can't be loaded, or cached image if already present in skiaResCtx
  sk_sp<SkImage> getImage(ImageSourceType type, const std::string& imageName, DrawImageStats* stats);

  std::filesystem::path getImagePath(ImageSourceType type, const std::string& imageName);

  // utils to access current state
  float getGlobalAlpha() {
    const auto& sf = stateStack_.back();
    return sf.globalAlpha;
  }

  SkColor getSkFillColor() {
    const auto& sf = stateStack_.back();
    return SkColorSetARGB(
        sf.globalAlpha * sf.fillColor[3] * 255.0f,
        sf.fillColor[0] * 255.0f,
        sf.fillColor[1] * 255.0f,
        sf.fillColor[2] * 255.0f);
  }

  SkColor getSkStrokeColor() {
    const auto& sf = stateStack_.back();
    return SkColorSetARGB(
        sf.globalAlpha * sf.strokeColor[3] * 255.0f,
        sf.strokeColor[0] * 255.0f,
        sf.strokeColor[1] * 255.0f,
        sf.strokeColor[2] * 255.0f);
  }

  SkPaint getFillPaint() {
    SkPaint paint;
    paint.setStyle(SkPaint::kFill_Style);
    paint.setColor(getSkFillColor());
    paint.setAntiAlias(true);
    return paint;
  }

  SkPaint getStrokePaint() {
    const auto& sf = stateStack_.back();
    SkPaint paint;
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setColor(getSkStrokeColor());
    paint.setAntiAlias(true);
    paint.setStrokeWidth(sf.strokeWidth_px);
    paint.setStrokeJoin((SkPaint::Join)sf.strokeJoin);
    return paint;
  }

  // drawing utils
  void drawTextWithPaint_(const std::string& text, double x, double y, const SkPaint& paint);
};

} // namespace canvex
