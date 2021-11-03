#pragma once
#include "canvas_display_list.h"

namespace canvex {

struct GraphicsExecutionStats {
  int64_t graphicsRender_us;
  int64_t fileWrite_us;
};

bool RenderDisplayListToPNG(
  const VCSCanvasDisplayList& dl,
  const std::string& dstFile,
  GraphicsExecutionStats* stats  // optional stats
);

} // namespace canvex
