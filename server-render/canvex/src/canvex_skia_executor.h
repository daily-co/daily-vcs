#pragma once
#include "canvas_display_list.h"
#include <filesystem>

namespace canvex {

enum RenderFormat {
  Rgba,
  Bgra,
};

struct GraphicsExecutionStats {
  int64_t graphicsRender_us;
  int64_t fileWrite_us;
};

bool RenderDisplayListToPNG(
  const VCSCanvasDisplayList& dl,
  const std::filesystem::path& dstFile,
  const std::filesystem::path& resourceDir,
  GraphicsExecutionStats* stats  // optional stats
);

bool RenderDisplayListToRawBuffer(
  const VCSCanvasDisplayList& dl,
  RenderFormat format,
  uint8_t *imageBuffer,
  uint32_t w,
  uint32_t h,
  uint32_t rowBytes,
  const std::filesystem::path& resourceDir,
  GraphicsExecutionStats* stats  // optional stats
);

} // namespace canvex
