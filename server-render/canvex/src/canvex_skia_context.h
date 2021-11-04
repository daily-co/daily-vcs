#pragma once
#include "skia_includes.h"
#include <iostream>
#include <unordered_map>

/*
 Implements a basic HTML-style canvas 2D context around Skia.
*/

namespace canvex {

// The canvas API has state that can be saved but is not part of Skia's save/restore.
// This frame object tracks that extra state.
struct CanvexContextStateFrame {
  float globalAlpha = 1.0;
  float fillColor[4] = {0, 0, 0, 0}; // RGBA
  float strokeColor[4] = {0, 0, 0, 0};
  float strokeWidth_px = 1.0;
  double fontSize = 12;
  int fontWeight = 400;
};

class CanvexContext {
 public:
  CanvexContext(std::shared_ptr<SkCanvas> canvas);

  void save();
  void restore();
  void rotate(double radians);

  void setFillStyle(const std::string& s);
  void setFont(const std::string& weight, const std::string& style, double pxSize, const std::string& name);

  void fillRect(double x, double y, double w, double h);
  void fillText(const std::string& text, double x, double y);

 private:
  // external rendering target
  std::shared_ptr<SkCanvas> canvas_;

  // internal state
  std::unique_ptr<SkPath> path_;
  std::vector<CanvexContextStateFrame> stateStack_;

  // cached resources.
  // TODO: move these to a higher-level object that can be shared between contexts
  std::unordered_map<int, sk_sp<SkTypeface>> typefaceCache_HelveticaByWeight_;

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
};

} // namespace canvex
