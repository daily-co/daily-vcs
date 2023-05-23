#include "yuv_compositor.h"
#include <algorithm>
#include <iostream>
#include "libyuv.h"


namespace vcsrender {


static void blendRGBAOverI420_inPlace(
  Yuv420PlanarBuf& dstBuf,
  uint8_t* rgbaBuf, // size must be same as dstBuf
  size_t rgbaRowBytes
) {
  const int w = dstBuf.w;
  const int h = dstBuf.h;
  const int chromaW = w / 2;

  // TODO: temp buffer should be passed from outside
  // instead of alloc here
  Yuv420PlanarBuf tempBuf(w, h);

  // DEBUG: write a gradient into the input.
  // this helps detect whether rendering issues are before or after this step.
  /*if (0) {
    for (int y = 0; y < h; y++) {
      memset(rgbaBuf + y * rgbaRowBytes, 200 + y, rgbaRowBytes);
    }
  }*/

  libyuv::ARGBToI420(
    rgbaBuf, // source
    rgbaRowBytes,
    tempBuf.data, // destination
    tempBuf.rowBytes_y,
    tempBuf.getCbData(),
    tempBuf.rowBytes_ch,
    tempBuf.getCrData(),
    tempBuf.rowBytes_ch,
    w,
    h);

  // we now have the RGB data as I420 in tempBuf;
  // blend it to the destination using the original alpha

  for (int y = 0; y < h; y ++) {
    const uint32_t* overBufBGRA = reinterpret_cast<uint32_t*>(rgbaBuf + y * rgbaRowBytes);
    const uint8_t* srcBuf_y = tempBuf.data + y * tempBuf.rowBytes_y; //tempY->data + y * rowBytes_tempY;
    uint8_t* dstBuf_y = dstBuf.data + y * dstBuf.rowBytes_y;  // dstY->data + y * rowBytes_dstY;

    for (int x = 0; x < w; x++) {
      // fixed-point blend
      const uint32_t yOver = srcBuf_y[x];
      const uint32_t yBase = dstBuf_y[x];

      const uint32_t a = overBufBGRA[x] >> 24; // little-endian
      const uint32_t aInv = 255 - a;

      // luma layers should be in video range [16, 235], and our top layer is premultiplied.
      // convert to [0, 219] range for blending and then back when writing out.
      // this intermediate result is in 255x fixed point.
      const uint32_t yComp_fx = (std::max(0, (int)yOver - 16) * 255) + (std::max(0, (int)yBase - 16) * aInv);

      // 60945 is the maximum luma value for the fixed point result; anything above is white
      dstBuf_y[x] = (yComp_fx >= 60945) ? 255 : yComp_fx / 255 + 16;
    }

    if (y % 2 == 0) { // do chroma row too
      const size_t srcChOffset = (y / 2) * tempBuf.rowBytes_ch;
      const uint8_t* srcBuf_Cb = tempBuf.getCbData() + srcChOffset;
      const uint8_t* srcBuf_Cr = tempBuf.getCrData() + srcChOffset;
      const size_t dstChOffset = (y / 2) * dstBuf.rowBytes_ch;
      uint8_t* dstBuf_Cb = dstBuf.getCbData() + dstChOffset;
      uint8_t* dstBuf_Cr = dstBuf.getCrData() + dstChOffset;

      for (int x = 0; x < chromaW; x++) {
        // fixed-point blend
        const uint32_t cbOver = srcBuf_Cb[x];
        const uint32_t crOver = srcBuf_Cr[x];
        const uint32_t cbBase = dstBuf_Cb[x];
        const uint32_t crBase = dstBuf_Cr[x];

        const uint32_t a = overBufBGRA[x * 2] >> 24; // little-endian
        const uint32_t aInv = 255 - a;

        const uint32_t cbComp_fx = (cbOver * a) + (cbBase * aInv);
        dstBuf_Cb[x] = cbComp_fx / 255;

        const uint32_t crComp_fx = (crOver * a) + (crBase * aInv);
        dstBuf_Cr[x] = crComp_fx / 255;
      }
    }
  }
}


YuvCompositor::YuvCompositor(int32_t w, int32_t h, const std::string& canvexResDir)
  : w_(w), h_(h)
{
  canvexCtx_ = CanvexResourceCtxCreate(canvexResDir.c_str());

  // retained buffer for the final 4:2:0 composite
  compBuf_ = std::make_shared<Yuv420PlanarBuf>(w_, h_);

  // retained buffer for overlay graphics in RGBA format
  fgRGBABufRowBytes_ = w_ * 4;
  fgRGBABuf_ = new uint8_t[fgRGBABufRowBytes_ * h_];
  memset(fgRGBABuf_, 0, fgRGBABufRowBytes_ * h_);

  // retained buffer used as intermediate during layer rendering;
  // will be resized if needed, so initial capacity is a guess of what's usually enough
  layerTempBufSize_ = lround(1.2 * compBuf_->dataSize);
  layerTempBuf_ = new uint8_t[layerTempBufSize_];
}

YuvCompositor::~YuvCompositor() {
  if (canvexCtx_) CanvexResourceCtxDestroy(canvexCtx_);
  if (fgRGBABuf_) delete fgRGBABuf_;
  if (layerTempBuf_) delete layerTempBuf_;
}

bool YuvCompositor::setVideoLayersJSON(const std::string& jsonStr) {
  return setVideoLayersJSON(jsonStr, 1.0);
}

bool YuvCompositor::setVideoLayersJSON(const std::string& jsonStr, double layerScale) {
  try {
    videoLayers_ = ParseVCSVideoLayerListJSON(jsonStr, {layerScale});
  } catch (std::exception& e) {
    std::cerr << "** Error parsing VCS video layers JSON: " << e.what() << std::endl;
    return false;
  }
  return true;
}

bool YuvCompositor::setFgDisplayListJSON(const std::string& jsonStr) {
  // the canvex C API only provides a render method that does
  // parse + RGBA render in one shot, so just retain the string here.
  pendingCanvexJSONUpdate_ = jsonStr;
  return true;
}

std::shared_ptr<Yuv420PlanarBuf> YuvCompositor::renderFrame(
  __attribute__((unused)) uint64_t frameIdx,
  const VideoInputBufsById& inputBufsById)
{
  //std::cout << "rendering frame " << frameIdx << " ... " << std::endl;

  if (pendingCanvexJSONUpdate_) {
    std::cout << " .. updating canvex buffer" << std::endl;
    CanvexRenderJSON_RGBA(
      canvexCtx_,
      pendingCanvexJSONUpdate_->c_str(),
      fgRGBABuf_,
      w_,
      h_,
      fgRGBABufRowBytes_,
      CanvexAlphaMode::CANVEX_PREMULTIPLIED,
      nullptr /* execution stats */);

    pendingCanvexJSONUpdate_ = std::nullopt;
  }

  // TODO: clear can be skipped if video layer frames cover entire viewport.
  // in practice the common case would be layer #0 at full screen, and checking for that is easy.
  compBuf_->clearWithBlack();

  if (!videoLayers_ || videoLayers_->size() < 1) {
    std::cout << " .. videoLayers is empty" << std::endl;
  } else {
    //std::cout << " .. videoLayers count = " << videoLayers_->size() << std::endl;

    size_t n = videoLayers_->size();
    for (size_t i = 0; i < n; i++) {
      const auto& layerDesc = (*videoLayers_)[i];
      auto inputId = layerDesc.id;
      auto inputHit = inputBufsById.find(inputId);
      if (inputHit == inputBufsById.end()) {
        std::cerr << "** No video input provided for id " << inputId << " requested by layerDesc #" << i << std::endl;
        continue;
      }

      //std::cout << " . .. rendering layer #" << i << " with id " << inputId << std::endl;
      renderLayerInPlace_(*compBuf_, *(inputHit->second), layerDesc);
    }
  }

  // composite RGBA foreground
  blendRGBAOverI420_inPlace(*compBuf_, fgRGBABuf_, fgRGBABufRowBytes_);

  //std::cout << "frame finished." << std::endl;

  return compBuf_;
}

void YuvCompositor::renderLayerInPlace_(
  Yuv420PlanarBuf& dstBuf,
  Yuv420PlanarBuf& srcBuf,
  const VideoLayerDesc& layerDesc)
{
  // not const because cropping may change these
  int srcW = srcBuf.w;
  int srcH = srcBuf.h;
  int scaleW = lround(layerDesc.frame.w);
  int scaleH = lround(layerDesc.frame.h);
  int scaleBufW = scaleW;
  int scaleBufH = scaleH;
  size_t dstDataOffY = 0, dstDataOffCh = 0;

  // cropping can change offset within source image
  size_t srcDataOffY = 0, srcDataOffCh = 0;

  int srcRowBytes_y = srcBuf.rowBytes_y;
  int srcRowBytes_ch = srcBuf.rowBytes_ch;

  const double origAsp = (double)srcW / srcH;
  const double dstAsp = layerDesc.frame.w / layerDesc.frame.h;

  if (layerDesc.attrs.scaleMode == VCSScaleMode::fill) {
    // compute aspect ratio to fill the available frame
    if (origAsp > dstAsp) {
      // cropping left and right sides, so modify source width
      double origW = srcW;
      srcW = floor(dstAsp * srcH);

      // offset crop to center
      double xOff_px = (origW - srcW) / 2.0;
      srcDataOffY = floor(xOff_px);
      srcDataOffCh = floor(xOff_px / 2.0);
    } else if (origAsp < dstAsp) {
      // cropping top and bottom sides, so modify source height
      double origH = srcH;
      srcH = floor(srcW / dstAsp);

      // offset crop to center
      double yOff_px = (origH - srcH) / 2.0;
      srcDataOffY = floor(yOff_px) * srcRowBytes_y;
      srcDataOffCh = floor(yOff_px / 2.0) * srcRowBytes_ch;
    }
  } else {
    // fit into the given frame
    if (origAsp > dstAsp) {
      // wide content, so letterbox (Y offset in destination)
      scaleH = lround(layerDesc.frame.w / origAsp);

      double yOff_px = ((double)scaleBufH - scaleH) / 2.0;
      dstDataOffY = floor(yOff_px) * scaleBufW;
      dstDataOffCh = floor(yOff_px / 2.0) * (scaleBufW / 2);

    } else if (origAsp < dstAsp) {
      // narrow content, so pillarbox (X offset in destination)
      scaleW = lround(layerDesc.frame.h * origAsp);

      double xOff_px = ((double)scaleBufW - scaleW) / 2.0;
      dstDataOffY = floor(xOff_px);
      dstDataOffCh = floor(xOff_px / 2.0);
    }
  } // end of scaleMode fit/fill

  const int dstXOffset = lround(layerDesc.frame.x);
  const int dstYOffset = lround(layerDesc.frame.y);

  Yuv420PlanarBuf tempScaledBuf(scaleBufW, scaleBufH);

  if (scaleBufW != scaleW || scaleBufH != scaleH) {
    tempScaledBuf.clearWithBlack();
  }

  libyuv::I420Scale(
        srcBuf.data + srcDataOffY, // source
        srcRowBytes_y,
        srcBuf.getCbData() + srcDataOffCh,
        srcRowBytes_ch,
        srcBuf.getCrData() + srcDataOffCh,
        srcRowBytes_ch,
        srcW,
        srcH,
        tempScaledBuf.data + dstDataOffY, // destination
        scaleBufW,
        tempScaledBuf.getCbData() + dstDataOffCh,
        tempScaledBuf.rowBytes_ch,
        tempScaledBuf.getCrData() + dstDataOffCh,
        tempScaledBuf.rowBytes_ch,
        scaleW,
        scaleH,
        libyuv::kFilterBilinear);

  // copy into destination.
  // TODO: handle mask, i.e. rounded corners.
  // render+cache as needed, then apply the mask here when copying

  const int outW = dstBuf.w;
  const int outH = dstBuf.h;

  const int minDstY = std::max(0, dstYOffset);
  const int maxDstY = std::min(outH - 1, dstYOffset + scaleBufH - 1);

  const int minDstX = std::max(0, dstXOffset);
  const int maxDstX = std::min(outW - 1, dstXOffset + scaleBufW - 1);
  const int srcCopyXOffset = minDstX - dstXOffset;

  srcRowBytes_y = scaleBufW;
  const int srcCopyLen_y = std::min(scaleBufW, std::max(0, maxDstX - minDstX));

  for (int y = minDstY; y <= maxDstY; y++) {
    const size_t dstOff = y * dstBuf.rowBytes_y + minDstX;
    uint8_t *dst_y = dstBuf.data + dstOff;

    const size_t srcOff = (y - dstYOffset) * srcRowBytes_y + srcCopyXOffset;
    const uint8_t* src_y = tempScaledBuf.data + srcOff;

    // TODO: if mask specified, apply it instead of memcpy here
    memcpy(dst_y, src_y, srcCopyLen_y);
  }

  srcRowBytes_ch = tempScaledBuf.rowBytes_ch;
  const int srcCopyLen_ch = std::min((int)tempScaledBuf.w / 2, std::max(0, (maxDstX - minDstX) / 2));

  for (int yy = minDstY; yy < maxDstY; yy += 2) {
    const size_t dstOff = (yy / 2) * dstBuf.rowBytes_ch + minDstX / 2;
    uint8_t* dst_Cb = dstBuf.getCbData() + dstOff;
    uint8_t* dst_Cr = dstBuf.getCrData() + dstOff;

    const size_t srcOff = (yy - dstYOffset) / 2 * srcRowBytes_ch + srcCopyXOffset / 2;
    const uint8_t* src_Cb = tempScaledBuf.getCbData() + srcOff;
    const uint8_t* src_Cr = tempScaledBuf.getCrData() + srcOff;

    // TODO: if mask specified, apply it instead of memcpy here
    memcpy(dst_Cb, src_Cb, srcCopyLen_ch);
    memcpy(dst_Cr, src_Cr, srcCopyLen_ch);
  }
}

} // namespace vcsrender
