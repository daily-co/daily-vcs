#include "../include/canvex_c_api.h"

// internal C++ API
#include "canvas_display_list.h"
#include "canvex_skia_executor.h"
#include "canvex_skia_resource_context.h"
#include "file_util.h"
#include "time_util.h"

#include "skia_includes.h"

#include <iostream>
#include <string.h>

using namespace canvex;


namespace canvex::c_api_internal {

struct ResourceCtx {
  ResourceCtx(const char* adir) {
    if (adir && strlen(adir) > 0) {
      resourceDir = adir;
      std::cout << "ResourceCtx set up using given path: " << resourceDir << std::endl;
    } else {
      resourceDir = std::filesystem::current_path() / "../../res";
      std::cout << "ResourceCtx set up using default relative path: " << resourceDir << std::endl;
    }
  }

  std::filesystem::path resourceDir;
  CanvexSkiaResourceContext skiaResourceCtx;
};

} // namespace canvex::c_api_internal


CanvexResourceCtx CanvexResourceCtxCreate(
  const char *resourceDir
) {
  auto ctx = new canvex::c_api_internal::ResourceCtx(resourceDir);
  return static_cast<void*>(ctx);
}

void CanvexResourceCtxDestroy(CanvexResourceCtx ctx_c) {
  auto ctx = static_cast<canvex::c_api_internal::ResourceCtx*>(ctx_c);
  delete ctx;
}


static CanvexRenderResult CanvexRenderJSON_Raw(
  CanvexResourceCtx ctx_c,
  canvex::RenderFormat format,
  const char *json,
  uint8_t *dstImageData,
  uint32_t dstImageW,
  uint32_t dstImageH,
  uint32_t dstImageRowBytes,
  CanvexAlphaMode dstAlpha,
  CanvexExecutionStats* stats // optional stats
) {
  if (!json) {
    return CanvexRenderError_InvalidArgument_JSONInput;
  }
  if (!dstImageData ||
      dstImageW < 1 || dstImageH < 1 ||
      (dstImageRowBytes != 0 && dstImageRowBytes < dstImageW*4)) {
    return CanvexRenderError_InvalidArgument_ImageOutput;
  }
  if (dstImageRowBytes == 0) {
    dstImageRowBytes = dstImageW*4;
  }

  auto ctx = static_cast<canvex::c_api_internal::ResourceCtx*>(ctx_c);
  if (!ctx) {
    return CanvexRenderError_InvalidArgument_ResourceContext;
  }

  double t0 = getMonotonicTime();

  std::unique_ptr<VCSCanvasDisplayList> displayList;
  try {
    displayList = ParseVCSDisplayListJSON(json);
  } catch (std::exception& e) {
    std::cerr << "Unable to parse canvex display list JSON: "<< e.what() << std::endl;
    return CanvexRenderError_JSONParseFail;
  }

  double t1 = getMonotonicTime();
  if (stats) {
    memset(stats, 0, sizeof(CanvexExecutionStats));
    stats->json_parse_us = (t1 - t0) * 1.0e6;
  }

  if (!RenderDisplayListToRawBuffer(*displayList, format,
    dstImageData, dstImageW, dstImageH, dstImageRowBytes, dstAlpha,
    ctx->resourceDir,
    &ctx->skiaResourceCtx,
    stats)) {
    return CanvexRenderError_GraphicsUnspecifiedError;
  }

  return CanvexRenderSuccess;
}

CanvexRenderResult CanvexRenderJSON_RGBA(
  CanvexResourceCtx ctx_c,
  const char *json,
  uint8_t *dstImageData,
  uint32_t dstImageW,
  uint32_t dstImageH,
  uint32_t dstImageRowBytes,
  CanvexAlphaMode dstAlpha,
  CanvexExecutionStats* stats // optional stats
) {
  return CanvexRenderJSON_Raw(
      ctx_c, canvex::RenderFormat::Rgba, json, dstImageData, dstImageW, dstImageH, dstImageRowBytes, dstAlpha, stats
  );
}

CanvexRenderResult CanvexRenderJSON_BGRA(
  CanvexResourceCtx ctx_c,
  const char *json,
  uint8_t *dstImageData,
  uint32_t dstImageW,
  uint32_t dstImageH,
  uint32_t dstImageRowBytes,
  CanvexAlphaMode dstAlpha,
  CanvexExecutionStats* stats // optional stats
) {
  return CanvexRenderJSON_Raw(
      ctx_c, canvex::RenderFormat::Bgra, json, dstImageData, dstImageW, dstImageH, dstImageRowBytes, dstAlpha, stats
  );
}


CanvexRenderResult CanvexRenderRoundedRectMask_u8(
  uint8_t *dstImageData,
  uint32_t dstImageW,
  uint32_t dstImageH,
  uint32_t dstImageRowBytes,
  // coordinates and corner radii for the rounded rectangle
  double x, double y, double w, double h,
  double tl, double tr, double br, double bl
) {
  auto dstInfo = SkImageInfo::MakeA8(SkISize::Make(dstImageW, dstImageH));
  auto canvas = SkCanvas::MakeRasterDirect(dstInfo, dstImageData, dstImageRowBytes);
  
  // Skia roundrect API expects radius pairs (for each corner, x/y radius explicitly defined)
  const SkScalar radii[8] = {
    (SkScalar)tl, (SkScalar)tl,
    (SkScalar)tr, (SkScalar)tr,
    (SkScalar)br, (SkScalar)br,
    (SkScalar)bl, (SkScalar)bl
  };

  SkPath path{};
  path.addRoundRect(SkRect::MakeXYWH(x, y, w, h), radii);

  SkPaint paint;
  paint.setStyle(SkPaint::kFill_Style);
  paint.setColor(SK_ColorWHITE);
  paint.setAntiAlias(true);

  canvas->drawPath(path, paint);

  canvas->flush();

  return CanvexRenderSuccess;
}

