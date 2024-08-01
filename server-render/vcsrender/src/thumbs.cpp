#include "thumbs.h"
#include "libyuv.h"


namespace vcsrender {

static std::unique_ptr<std::string> renderLumaToAsciiArt(const uint8_t* srcBuf, size_t rowBytes, uint32_t w, uint32_t h) {
  const char* kAsciiChars = 
    "  `.-':_,^=;><+!rc*/z?sltv)j7(|fi{C}FI31TLu[neoZ5YxJya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@";
  const int32_t kNumAsciiChars = 93;

  const auto asciiH = h + 2;  // add dash lines at top and bottom
  const auto numLineBreaks = asciiH - 1;
  const size_t dstAsciiSize = w * asciiH + numLineBreaks;
  auto dstBuf = std::make_unique<uint8_t[]>(dstAsciiSize);

  uint8_t *dst = dstBuf.get();

  for (uint32_t x = 0; x < w; x++) {
    *dst++ = '-';
  }
  *dst++ = '\n';

  for (uint32_t y = 0; y < h; y++) {
    const uint8_t* src = srcBuf + y * rowBytes;

    for (uint32_t x = 0; x < w; x++) {
      int32_t v = *src++;
      
      // luma is expected to be in video range [16, 235]
      v -= 16;
      if (v < 0) v = 0;
      if (v > 219) v = 219;

      const int32_t scale = 110;  // == 93.0 / 219.0 in 8-bit fixed point
      v = (v * scale) >> 8;
      // scale was rounded up, so must clamp result
      if (v > kNumAsciiChars - 1) v = kNumAsciiChars - 1;

      *dst++ = kAsciiChars[v];
    }

    *dst++ = '\n';
  }

  for (uint32_t x = 0; x < w; x++) {
    *dst++ = '-';
  }

  return std::make_unique<std::string>(reinterpret_cast<char*>(dstBuf.get()), dstAsciiSize);
}

std::unique_ptr<std::string> renderThumbAtFrame(
  const ThumbCaptureSettings& settings,
  uint64_t frameIndex,
  Yuv420PlanarBuf& yuvBuf
) {
  if (settings.w < 1 || settings.h < 1 || settings.captureIntervalInFrames < 1) {
    // nothing to do with these settings
    return nullptr;
  }

  if (settings.captureIntervalInFrames > 1) {
    // check if we should render at this frame
    if (frameIndex % settings.captureIntervalInFrames != 0)
      return nullptr;
  }

  const uint32_t dstW = settings.w;
  const uint32_t dstH = settings.h;

  const size_t dstSize = dstW * dstH;
  auto dstLuma = std::make_unique<uint8_t[]>(dstSize);

  libyuv::ScalePlane(yuvBuf.data,
                      yuvBuf.rowBytes_y,
                      yuvBuf.w,
                      yuvBuf.h,
                      dstLuma.get(),
                      dstW,
                      dstW,
                      dstH,
                      libyuv::kFilterBilinear);

  if (settings.outputMode == ThumbCaptureOutputMode::Luma_RawBinary) {
    return std::make_unique<std::string>(reinterpret_cast<char*>(dstLuma.get()), dstSize);
  } else {
    return renderLumaToAsciiArt(dstLuma.get(), dstW, dstW, dstH);
  }
}

} // namespace vcsrender