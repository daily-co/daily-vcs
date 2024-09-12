#pragma once
#include <optional>
#include <unordered_map>
#include "canvex_c_api.h"
#include "mask.h"
#include "yuvbuf.h"
#include "parse/parse_scenedesc.h"

namespace vcsrender {

/*
  A compositor instance should be retained between frames.
  
  Inputs should be updated only when there's a change (e.g. `fgDisplayList` was modified).
  This permits caching of render intermediates.
*/

class YuvCompositor {
 public:
  YuvCompositor(int32_t w, int32_t h, const std::string& canvexResDir);
  ~YuvCompositor();

 // parsed data inputs
 bool setVideoLayersJSON(const std::string& jsonStr);
 bool setVideoLayersJSON(const std::string& jsonStr, double layerScale);

 bool setFgDisplayListJSON(const std::string& jsonStr);

 // rendering a frame using dynamic image inputs and cached data inputs.
 // throws on error.
 // the returned buffer is not thread-safe and must be copied if the caller doesn't immediately process the data.
 std::shared_ptr<Yuv420PlanarBuf> renderFrame(uint64_t frameIdx, const VideoInputBufsById& inputBufsById);

 // ---
 private:
  int32_t w_;
  int32_t h_;

  CanvexResourceCtx canvexCtx_;

  std::shared_ptr<Yuv420PlanarBuf> compBuf_;
  std::shared_ptr<Yuv420PlanarBuf> compTempBuf_;

  uint8_t* fgRGBABuf_;
  uint32_t fgRGBABufRowBytes_;

  uint8_t* layerTempBuf_;
  size_t layerTempBufSize_;

  MaskCache maskCache_;

  std::optional<std::string> pendingCanvexJSONUpdate_ = std::nullopt;
  std::unique_ptr<VCSVideoLayerList> videoLayers_ = nullptr;

  void renderLayerInPlace_(
    Yuv420PlanarBuf& dstBuf,
    const Yuv420PlanarBuf& srcBuf,
    const VideoLayerDesc& layerDesc
  );
};

} // namespace vcsrender
