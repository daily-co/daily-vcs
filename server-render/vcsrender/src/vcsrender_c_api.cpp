#include "../include/vcsrender_c_api.h"

// internal C++ API
#include "yuv_compositor.h"

#include "libyuv.h"

#include <algorithm>
#include <filesystem>
#include <iostream>
#include <string>

using namespace vcsrender;


namespace vcsrender::c_api_internal {

struct RenderCtx {
  RenderCtx(int32_t w, int32_t h, const std::string& canvexResDir)
  : compositor(w, h, canvexResDir) {
  }

  YuvCompositor compositor;
};

} // namespace vcsrender::c_api_internal


VcsRenderCtx VcsRenderCtxCreate(
  uint32_t w,
  uint32_t h,
  const char *adir
) {
  if (w < 1 || h < 1) {
    return nullptr;
  }
  std::filesystem::path resourceDir;
  if (adir && strlen(adir) > 0) {
    resourceDir = adir;
    std::cout << "VcsRenderCtx set up using given path: " << resourceDir << std::endl;
  } else {
    resourceDir = std::filesystem::current_path() / "../../res";
    std::cout << "VcsRenderCtx set up using default relative path: " << resourceDir << std::endl;
  }

  auto ctx = new vcsrender::c_api_internal::RenderCtx(w, h, resourceDir.string());

  return static_cast<void*>(ctx);
}

void VcsRenderCtxDestroy(VcsRenderCtx ctx_c) {
  auto ctx = static_cast<vcsrender::c_api_internal::RenderCtx*>(ctx_c);
  delete ctx;
}

VcsRenderResult VcsRenderCtxUpdateVideoLayersJSON(
  VcsRenderCtx ctx_c,
  const char *json_c
) {
  if (!ctx_c || !json_c) {
    return VcsRenderError_InvalidArgument_JSONInput;
  }
  auto ctx = static_cast<vcsrender::c_api_internal::RenderCtx*>(ctx_c);
  auto jsonStr = std::string{json_c};

  std::cout << "VcsRenderCtx updating videolayers JSON, " << jsonStr.length() << std::endl;

  bool ok = ctx->compositor.setVideoLayersJSON(jsonStr);

  return ok ? VcsRenderSuccess : VcsRenderError_JSONParseFail;
}

VcsRenderResult VcsRenderCtxUpdateFgDisplayListJSON(
  VcsRenderCtx ctx_c,
  const char *json_c
)
{
  if (!ctx_c || !json_c) {
    return VcsRenderError_InvalidArgument_JSONInput;
  }
  auto ctx = static_cast<vcsrender::c_api_internal::RenderCtx*>(ctx_c);
  auto jsonStr = std::string{json_c};

  std::cout << "VcsRenderCtx updating fgdisplaylist JSON, " << jsonStr.length() << std::endl;

  bool ok = ctx->compositor.setFgDisplayListJSON(jsonStr);

  return ok ? VcsRenderSuccess : VcsRenderError_JSONParseFail;
}

size_t VcsBufferComputeDataSizeAndSetRowBytesYuv420Planar(VcsBufferYuv420Planar *buf) {
  if (!buf || buf->w == 0 || buf->h == 0) {
    return 0;
  }
  // same calculation as in the C++ version (yuvbuf.h)

  uint32_t rowBytes_y = buf->w;
  uint32_t rowBytes_ch = (buf->w + 1) / 2;

  // round up rowbytes to a multiple of 16
  rowBytes_y = (rowBytes_y + 15) & (~15);
  rowBytes_ch = (rowBytes_ch + 15) & (~15);

  uint32_t chromaH = (buf->h + 1) / 2;

  size_t ySize = rowBytes_y * buf->h;
  size_t chSize = rowBytes_ch * chromaH;
  size_t dataSize = ySize + 2 * chSize;

  buf->rowbytes_y = rowBytes_y;
  buf->rowbytes_ch = rowBytes_ch;
  return dataSize;
}

VcsRenderResult VcsRenderYuv420Planar(
  VcsRenderCtx ctx_c,
  uint64_t frameIndex,
  VcsBufferYuv420Planar *outputBufArg,
  const VcsVideoInputData *inputBufsArg,
  size_t numInputBufsArg
) {
  if (!ctx_c || !outputBufArg || (numInputBufsArg > 0 && !inputBufsArg)) {
    return VcsRenderError_InvalidArgument_Render;
  }
  auto ctx = static_cast<vcsrender::c_api_internal::RenderCtx*>(ctx_c);

  // copy buffer pointers into our internal C++ types.
  // the pixel data is not copied when using this constructor,
  // so these buffers are valid only for the duration of this call.
  auto dstBuf = std::make_shared<Yuv420PlanarBuf>(
                      outputBufArg->w, outputBufArg->h, outputBufArg->data,
                      outputBufArg->rowbytes_y, outputBufArg->rowbytes_ch);
  
  VideoInputBufsById inputBufs {};

  for (size_t i = 0; i < numInputBufsArg; i++) {
    auto id = inputBufsArg[i].input_id;
    auto buf = &(inputBufsArg[i].buffer);

    inputBufs[id] = std::make_shared<Yuv420PlanarBuf>(
                          buf->w, buf->h, (uint8_t*)buf->data,
                          buf->rowbytes_y, buf->rowbytes_ch);
  }

  /*std::cout << "VcsRenderCtx rendering frame " << frameIndex;
  std::cout << " at " << outputBufArg->w << "*" << outputBufArg->h;
  if (numInputBufsArg > 0) {
    std::cout << " - first input size " << inputBufsArg[0].buffer.w << "*" << inputBufsArg[0].buffer.h
              << ", rowbytes " << inputBufsArg[0].buffer.rowbytes_y << " / " << inputBufsArg[0].buffer.rowbytes_ch;
  }
  std::cout << std::endl;
  */
  /*if (numInputBufsArg > 0) {
    auto id = inputBufsArg[0].input_id;
    auto& inBuf = inputBufs[id];

    if (inBuf->w != dstBuf->w || inBuf->h != dstBuf->h) {
      std::cout << "buffer size differs: " << inBuf->w << " * " << inBuf->h << std::endl;
      return VcsRenderError_InvalidArgument_ImageOutput;
    }
    std::cout << "DEBUG: copying source" << std::endl;

    libyuv::I420Copy(
      inBuf->data,
      inBuf->rowBytes_y,
      inBuf->getCbData(),
      inBuf->rowBytes_ch,
      inBuf->getCrData(),
      inBuf->rowBytes_ch,

      dstBuf->data,
      dstBuf->rowBytes_y,
      dstBuf->getCbData(),
      dstBuf->rowBytes_ch,
      dstBuf->getCrData(),
      dstBuf->rowBytes_ch,

      dstBuf->w,
      dstBuf->h
    );
  }*/


  auto resultBuf = ctx->compositor.renderFrame(frameIndex, inputBufs);

  if (resultBuf->w != dstBuf->w ||
      resultBuf->h != dstBuf->h) {
    // it's the caller's responsibility to ensure that the buffer matches the compositor's output size.
    // a mismatch shouldn't happen this late.
    return VcsRenderError_InvalidArgument_ImageOutput;
  }

  // copy result into the given output buffer
  libyuv::I420Copy(
    resultBuf->data,
    resultBuf->rowBytes_y,
    resultBuf->getCbData(),
    resultBuf->rowBytes_ch,
    resultBuf->getCrData(),
    resultBuf->rowBytes_ch,

    dstBuf->data,
    dstBuf->rowBytes_y,
    dstBuf->getCbData(),
    dstBuf->rowBytes_ch,
    dstBuf->getCrData(),
    dstBuf->rowBytes_ch,

    dstBuf->w,
    dstBuf->h
  );

  return VcsRenderSuccess;
}
