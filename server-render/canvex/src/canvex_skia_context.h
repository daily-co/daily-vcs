#pragma once
#include "skia_includes.h"
#include <iostream>

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
  CanvexContext(std::shared_ptr<SkCanvas> canvas) : canvas_(canvas) {
    // init stack with state defaults
    stateStack_.push_back({});
  }

  void save() {
    canvas_->save();
    stateStack_.emplace_back(stateStack_.back());
  }

  void restore() {
    if (stateStack_.size() == 1) {
      std::cerr << "** warning: canvas context stack underflow in restore()" << std::endl;
      return;
    }
    canvas_->restore();
    stateStack_.pop_back();
  }



 private:
  // external rendering target
  std::shared_ptr<SkCanvas> canvas_;

  // internal state
  std::unique_ptr<SkPath> path_;
  std::vector<CanvexContextStateFrame> stateStack_;
};

} // namespace canvex
