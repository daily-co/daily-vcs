#pragma once
#include <memory>
#include "yuvbuf.h"

namespace vcsrender {

enum ThumbCaptureOutputMode {
  Luma_RawBinary = 1,  // raw luma data, no line breaks
  Luma_AsciiArt        // ASCII art with line breaks
};

struct ThumbCaptureSettings {
  int32_t w = 78;
  int32_t h = 20;
  uint64_t captureIntervalInFrames = 60;
  ThumbCaptureOutputMode outputMode = Luma_AsciiArt;
};

std::unique_ptr<std::string> renderThumbAtFrame(
  const ThumbCaptureSettings& settings,
  uint64_t frameIndex,
  Yuv420PlanarBuf& yuvBuf
);

} // namespace vcsrender
