#pragma once
#include "skia_includes.h"
#include <filesystem>
#include <iostream>
#include <unordered_map>

/*
 Implements a basic HTML-style canvas 2D context around Skia.
*/

namespace canvex {

enum JoinType {
  MITER = SkPaint::kMiter_Join,
  BEVEL = SkPaint::kBevel_Join,
  ROUND = SkPaint::kRound_Join,
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
};

class CanvexContext {
 public:
  CanvexContext(
    std::shared_ptr<SkCanvas> canvas,
    const std::filesystem::path& resPath);

  void save();
  void restore();
  void rotate(double radians);

  void setFillStyle(const std::string& s);
  void setStrokeStyle(const std::string& s);
  void setLineWidth(double lineW);
  void setLineJoin(JoinType t);
  void setFont(const std::string& weight, const std::string& style, double pxSize, const std::string& name);

  void fillRect(double x, double y, double w, double h);
  void strokeRect(double x, double y, double w, double h);
  void fillText(const std::string& text, double x, double y);
  void strokeText(const std::string& text, double x, double y);

  void drawImage_fromAssets(const std::string& imageName, double x, double y, double w, double h);

  // commands that operate on current path
  void beginPath();
  void closePath();
  void moveTo(double x, double y);
  void lineTo(double x, double y);
  void quadraticCurveTo(double cp_x, double cp_y, double x, double y);
  void clip();

 private:
  // external rendering target and configuration
  std::shared_ptr<SkCanvas> canvas_;
  std::filesystem::path resPath_;

  // internal state
  std::unique_ptr<SkPath> path_;
  std::vector<CanvexContextStateFrame> stateStack_;

  // cached resources.
  // TODO: move these to a higher-level object that can be shared between contexts
  std::unordered_map<std::string, sk_sp<SkTypeface>> typefaceCache_Roboto_;
  std::unordered_map<std::string, sk_sp<SkImage>> imageCache_assetNamespace_;

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

  // drawing utils
  void drawTextWithPaint_(const std::string& text, double x, double y, const SkPaint& paint);
};

} // namespace canvex
