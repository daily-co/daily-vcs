#include "../include/canvex_c_api.h"

// internal C++ API
#include "canvas_display_list.h"
#include "canvex_skia_executor.h"
#include "file_util.h"
#include "time_util.h"

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
  Alpha dstAlpha
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

  std::unique_ptr<VCSCanvasDisplayList> displayList;
  try {
    displayList = ParseVCSDisplayListJSON(json);
  } catch (std::exception& e) {
    std::cerr << "Unable to parse canvex display list JSON: "<< e.what() << std::endl;
    return CanvexRenderError_JSONParseFail;
  }

  // TODO: provide stats to caller?
  // currently no provision in C API for this

  if (!RenderDisplayListToRawBuffer(*displayList, format,
    dstImageData, dstImageW, dstImageH, dstImageRowBytes,
    ctx->resourceDir,
    nullptr,
    dstAlpha)) {
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
  Alpha dstAlpha
) {
  return CanvexRenderJSON_Raw(
      ctx_c, canvex::RenderFormat::Rgba, json, dstImageData, dstImageW, dstImageH, dstImageRowBytes, dstAlpha
  );
}

CanvexRenderResult CanvexRenderJSON_BGRA(
  CanvexResourceCtx ctx_c,
  const char *json,
  uint8_t *dstImageData,
  uint32_t dstImageW,
  uint32_t dstImageH,
  uint32_t dstImageRowBytes,
  Alpha dstAlpha
) {
  return CanvexRenderJSON_Raw(
      ctx_c, canvex::RenderFormat::Bgra, json, dstImageData, dstImageW, dstImageH, dstImageRowBytes, dstAlpha
  );
}
