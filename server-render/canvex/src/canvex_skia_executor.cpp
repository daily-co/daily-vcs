#include "canvex_skia_executor.h"
#include "canvex_skia_context.h"
#include "skia_includes.h"
#include "time_util.h"
#include <iostream>
#include <cstdio>

namespace canvex {

constexpr int MAX_CANVAS_DIM = 32768;

bool RenderDisplayListToPNG(
  const VCSCanvasDisplayList& dl,
  const std::string& dstFile,
  GraphicsExecutionStats* stats
) {
  const auto w = dl.width;
  const auto h = dl.height;
  if (w < 1 || h < 1) {
    throw new std::runtime_error("Display list canvas width/height is zero");
  }
  if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
    throw new std::runtime_error("Display list canvas width/height exceeds sanity maximum");
  }

  double t0 = getMonotonicTime();

  SkBitmap bitmap;
  bitmap.allocPixels(SkImageInfo::MakeN32Premul(w, h));

  double t1 = getMonotonicTime();

  renderDisplayListInBitmap(dl, bitmap);

  double t2 = getMonotonicTime();

  bool ok = true;
  if (!dstFile.empty()) {
    ok = writeBitmapToPNG(bitmap, dstFile);
  }

  double t3 = getMonotonicTime();
  if (stats) {
    stats->graphicsRender_us = (t2 - t1) * 1.0e6;
    stats->fileWrite_us = (t3 - t2) * 1.0e6;
  }
  return ok;
}

static void renderDisplayListInBitmap(const VCSCanvasDisplayList& dl, SkBitmap& bitmap) {
  auto canvas = std::make_shared<SkCanvas>(bitmap);

  canvas->clear(SK_ColorTRANSPARENT);

  CanvexContext ctx(canvas);

  for (const auto& cmd : dl.cmds) {
    switch (cmd.op) {
      default:
        std::cout << "Warning: unhandled canvas op: " << cmd.op << std::endl;
        break;

      save: {
        ctx.save();
        break;
      }
      restore: {
        ctx.restore();
        break;
      }
      fillStyle: {

        break;
      }
      font: {
        break;
      }
      clip: {
        break;
      }
      fillRect: {
        break;
      }
      fillText: {
        break;
      }
      drawImage: {
        break;
      }
    }
  }
}


static bool writeBitmapToPNG(SkBitmap& bitmap, const std::string& file) {
  sk_sp<SkData> pngData;
  try {
    auto image = SkImage::MakeFromBitmap(bitmap);
    pngData = image->encodeToData();
  } catch (std::exception& e) {
    std::cerr << "Unable to encode PNG: "<< e.what() << std::endl;
    return false;
  }

  FILE* pngFile = fopen(file.c_str(), "wb");
  if (!pngFile) {
    std::cerr << "Unable to open file: " << file << std::endl;
    return false;
  }
  fwrite(pngData->bytes(), pngData->size(), 1, pngFile);
  fclose(pngFile);

  return true;
}

} // namespace canvex
