#include "yuv_compositor.h"
#include <algorithm>
#include <iostream>
#include <sstream>
#include <cmath>
#include "libyuv.h"
#include "thumbs.h"
#include "time_util.h"


namespace vcsrender {


static void blendRGBAOverI420_inPlace(
  Yuv420PlanarBuf& dstBuf,
  uint8_t* rgbaBuf, // size must be same as dstBuf
  size_t rgbaRowBytes,
  Yuv420PlanarBuf& tempBuf
) {
  const int w = dstBuf.w;
  const int h = dstBuf.h;
  const int chromaW = (w + 1) / 2;

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
      const int yOver = srcBuf_y[x];
      const int yBase = dstBuf_y[x];

      const uint32_t a = overBufBGRA[x] >> 24; // little-endian
      const uint32_t aInv = 255 - a;

      // luma layers should be in video range [16, 235], and our top layer is premultiplied.
      // convert to [0, 219] range for blending and then back when writing out.
      // this intermediate result is in 255x fixed point.
      int yOver_clamped = yOver - 16;
      int yBase_clamped = yBase - 16;
      yOver_clamped = (yOver_clamped > 0) ? yOver_clamped : 0;
      yBase_clamped = (yBase_clamped > 0) ? yBase_clamped : 0;

      const uint32_t yComp_fx = (yOver_clamped * 255) + (yBase_clamped * aInv);

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

  // retained temp buffer used for final composite
  compTempBuf_ = std::make_shared<Yuv420PlanarBuf>(w_, h_);

  // retained buffer for overlay graphics in RGBA format
  fgRGBABufRowBytes_ = w_ * 4;
  fgRGBABuf_ = (uint8_t *) malloc(fgRGBABufRowBytes_ * h_);
  memset(fgRGBABuf_, 0, fgRGBABufRowBytes_ * h_);

  // retained buffer used as intermediate during layer rendering;
  // will be resized if needed, so initial capacity is a guess of what's usually enough
  layerTempBufSize_ = lround(1.2 * compBuf_->dataSize);
  layerTempBuf_ = (uint8_t *) malloc(layerTempBufSize_);
}

YuvCompositor::~YuvCompositor() {
  if (canvexCtx_) CanvexResourceCtxDestroy(canvexCtx_);
  if (fgRGBABuf_) free(fgRGBABuf_);
  if (layerTempBuf_) free(layerTempBuf_);
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
  uint64_t frameIdx,
  const VideoInputBufsById& inputBufsById)
{
  ThumbCaptureSettings thumbSettings{};

  renderFrame(frameIdx, inputBufsById, thumbSettings, nullptr);
}

 std::shared_ptr<Yuv420PlanarBuf> YuvCompositor::renderFrame(
  __attribute__((unused)) uint64_t frameIdx,
  const VideoInputBufsById& inputBufsById,
  ThumbCaptureSettings& thumbSettings,
  std::string* outThumbCaptureStr)
{
  //std::cout << "rendering frame " << frameIdx << " ... " << std::endl;

  if (pendingCanvexJSONUpdate_) {
    std::cout << "doing canvex update" << std::endl;
    CanvexRenderResult err = CanvexRenderJSON_RGBA(
      canvexCtx_,
      pendingCanvexJSONUpdate_->c_str(),
      fgRGBABuf_,
      w_,
      h_,
      fgRGBABufRowBytes_,
      CanvexAlphaMode::CANVEX_PREMULTIPLIED,
      nullptr /* execution stats */);
    if (err != CanvexRenderSuccess) {
      std::cerr << "** VCSRender canvex render failed, err code = " << err << std::endl;
    }
    pendingCanvexJSONUpdate_ = std::nullopt;
  }

  // TODO: clear can be skipped if video layer frames cover entire viewport.
  // in practice the common case would be layer #0 at full screen, and checking for that is easy.
  compBuf_->clearWithBlack();

  if (!videoLayers_ || videoLayers_->size() < 1) {
    //std::cout << " .. videoLayers is empty" << std::endl;
  } else {
    //std::cout << " .. videoLayers count = " << videoLayers_->size() << std::endl;

    size_t n = videoLayers_->size();
    for (size_t i = 0; i < n; i++) {
      const auto& layerDesc = (*videoLayers_)[i];
      auto inputId = layerDesc.id;
      //std::cout << " . .. rendering layer #" << i << " with id " << inputId << std::endl;
      auto inputHit = inputBufsById.find(inputId);
      if (inputHit == inputBufsById.end()) {
        // it's fine if there's no input by this id, then we just don't render
        //std::cout << "** No video input provided for id " << inputId << " requested by layerDesc #" << i << std::endl;
        continue;
      }
      const auto srcBuf = inputHit->second;

      renderLayerInPlace_(*compBuf_, *srcBuf, layerDesc);
    }
  }

  auto thumbBeforeComp = renderThumbAtFrame(thumbSettings, frameIdx, *compBuf_);

  // composite RGBA foreground
  blendRGBAOverI420_inPlace(*compBuf_, fgRGBABuf_, fgRGBABufRowBytes_, *compTempBuf_);

  //std::cout << "frame finished." << std::endl;

  auto thumbFinalOutput = renderThumbAtFrame(thumbSettings, frameIdx, *compBuf_);

  if (thumbBeforeComp || thumbFinalOutput) {
    std::stringstream thumbSs;
    if (thumbFinalOutput) {
      thumbSs << "\nThumb at " << frameIdx << ":\n" << *thumbFinalOutput << std::endl;
    }
    if (thumbBeforeComp && (!thumbFinalOutput || *thumbFinalOutput != *thumbBeforeComp)) {
      thumbSs << "Video layers only at " << frameIdx << ":\n" << *thumbBeforeComp << std::endl;
    }
    
    if (outThumbCaptureStr) {
      outThumbCaptureStr->append(thumbSs.str());
    } else {
      std::cout << thumbSs.str() << std::endl;
    }
  }

  return compBuf_;
}

void YuvCompositor::renderLayerInPlace_(
  Yuv420PlanarBuf& dstBuf,
  const Yuv420PlanarBuf& srcBuf,
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
    // compute aspect ratio to fill the available frame.

    // in fill mode, zoom can be applied.
    // it must be >=1 because zooming out would break the fill.
    // also apply a sanity upper limit of 4x.
    double zoom = layerDesc.attrs.zoomFactor;
    if (!std::isfinite(zoom) || zoom < 1.0) {
      zoom = 1.0;
    } else if (zoom > 4.0) {
      zoom = 4.0;
    }

    double cropW = srcW;
    double cropH = srcH;
    double xOff_px = 0;
    double yOff_px = 0;

    if (origAsp > dstAsp) {
      // cropping left and right sides, so modify source width
      cropW = dstAsp * srcH;
    } else if (origAsp < dstAsp) {
      // cropping top and bottom sides, so modify source height
      cropH = srcW / dstAsp;
    }

    if (zoom > 1.0) {
      cropW /= zoom;
      cropH /= zoom;
    }

    // offset crop to center
    xOff_px = ((double)srcW - cropW) / 2.0;
    yOff_px = ((double)srcH - cropH) / 2.0;

    srcW = floor(cropW);
    srcH = floor(cropH);
    if (xOff_px != 0.0) {
      srcDataOffY = floor(xOff_px);
      srcDataOffCh = floor(xOff_px / 2.0);
    }
    if (yOff_px != 0.0) {
      srcDataOffY += floor(yOff_px) * srcRowBytes_y;
      srcDataOffCh += floor(yOff_px / 2.0) * srcRowBytes_ch;
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

  Yuv420PlanarBuf tempScaledBuf(scaleBufW, scaleBufH, false);

  if (scaleBufW != scaleW || scaleBufH != scaleH) {
    tempScaledBuf.clearWithBlack();
  }

  /*std::cout
    << "source dim " << srcW << " * " << srcH
    << "  source rb " << srcRowBytes_y << ", " << srcRowBytes_ch
    << ": dataOffY " << srcDataOffY << ", " << srcDataOffCh
    << " - dst dim " << scaleW << " * " << scaleH
    << " - orig buf size " << scaleBufW << " * " << scaleBufH
    << "  scaledbuf dst rb " << tempScaledBuf.rowBytes_y << ", " << tempScaledBuf.rowBytes_ch
    << ": dataOffY " << dstDataOffY << ", " << dstDataOffCh
    << std::endl;
  */
  //memset(((Yuv420PlanarBuf)srcBuf).getCbData(), 127, srcBuf.rowBytes_ch * srcBuf.chromaH / 2);
  //memset(((Yuv420PlanarBuf)srcBuf).getCrData(), 127, srcBuf.rowBytes_ch * srcBuf.chromaH / 2);

  tempScaledBuf.clearWithBlack();

  libyuv::I420Scale(
        srcBuf.data + srcDataOffY, // source
        srcRowBytes_y,
        srcBuf.getConstCbData() + srcDataOffCh,
        srcRowBytes_ch,
        srcBuf.getConstCrData() + srcDataOffCh,
        srcRowBytes_ch,
        srcW,
        srcH,
        tempScaledBuf.data + dstDataOffY, // destination
        tempScaledBuf.rowBytes_y,
        tempScaledBuf.getCbData() + dstDataOffCh,
        tempScaledBuf.rowBytes_ch,
        tempScaledBuf.getCrData() + dstDataOffCh,
        tempScaledBuf.rowBytes_ch,
        scaleW,
        scaleH,
        libyuv::kFilterBilinear);

  // copy into destination with mask if needed
  const uint32_t cornerRadius = lround(layerDesc.attrs.cornerRadiusPx);
  bool useMask = cornerRadius > 0;
  std::shared_ptr<AlphaBuf> maskBuf;
  if (useMask) {
    maskBuf = maskCache_.getCachedMask(tempScaledBuf.w, tempScaledBuf.h, cornerRadius);
  }

  const int outW = dstBuf.w;
  const int outH = dstBuf.h;

  const int minDstY = std::max(0, dstYOffset);
  const int maxDstY = std::min(outH - 1, dstYOffset + scaleBufH - 1);

  const int minDstX = std::max(0, dstXOffset);
  const int maxDstX = std::min(outW - 1, dstXOffset + scaleBufW - 1);
  const int srcCopyXOffset = minDstX - dstXOffset;

  srcRowBytes_y = tempScaledBuf.rowBytes_y;
  const int srcCopyLen_y = std::min(scaleBufW, std::max(0, maxDstX - minDstX + 1));

  for (int y = minDstY; y <= maxDstY; y++) {
    const size_t dstOff = y * dstBuf.rowBytes_y + minDstX;
    uint8_t *dst_y = dstBuf.data + dstOff;

    const size_t srcOff = (y - dstYOffset) * srcRowBytes_y + srcCopyXOffset;
    const uint8_t* src_y = tempScaledBuf.data + srcOff;

    if (!useMask) {
      memcpy(dst_y, src_y, srcCopyLen_y);
    } else {
      const size_t maskSrcOff = (y - dstYOffset) * maskBuf->rowBytes + srcCopyXOffset;
      const uint8_t* src_mask = maskBuf->data + maskSrcOff;
      for (int x = 0; x < srcCopyLen_y; x++) {
        const int maskV = src_mask[x];
        if (maskV < 2) {
          continue;
        }
        if (maskV >= 254) {
          dst_y[x] = src_y[x];
          continue;
        }

        // fixed-point blend
        int yOver = src_y[x];
        const int yBase = dst_y[x];
        const uint32_t aInv = 255 - maskV;

        // luma layers should be in video range [16, 235].
        // convert to [0, 219] range for blending and then back when writing out.
        // this intermediate result is in 255x fixed point.
        int yOver_clamped = yOver - 16;
        int yBase_clamped = yBase - 16;
        yOver_clamped = (yOver_clamped > 0) ? yOver_clamped : 0;
        yBase_clamped = (yBase_clamped > 0) ? yBase_clamped : 0;

        const uint32_t yComp_fx = (yOver_clamped * maskV) + (yBase_clamped * aInv);

        // 60945 is the maximum luma value for the fixed point result; anything above is white
        dst_y[x] = (yComp_fx >= 60945) ? 255 : yComp_fx / 255 + 16;

      }
    }
  }

  srcRowBytes_ch = tempScaledBuf.rowBytes_ch;
  const int srcCopyLen_ch = std::min((int)tempScaledBuf.w / 2, std::max(0, (maxDstX - minDstX + 1) / 2));

  for (int yy = minDstY; yy < maxDstY; yy += 2) {
    const size_t dstOff = (yy / 2) * dstBuf.rowBytes_ch + minDstX / 2;
    uint8_t* dst_Cb = dstBuf.getCbData() + dstOff;
    uint8_t* dst_Cr = dstBuf.getCrData() + dstOff;

    const size_t srcOff = (yy - dstYOffset) / 2 * srcRowBytes_ch + srcCopyXOffset / 2;
    const uint8_t* src_Cb = tempScaledBuf.getCbData() + srcOff;
    const uint8_t* src_Cr = tempScaledBuf.getCrData() + srcOff;

    if (!useMask) {
      memcpy(dst_Cb, src_Cb, srcCopyLen_ch);
      memcpy(dst_Cr, src_Cr, srcCopyLen_ch);
    } else {
      const size_t maskSrcOff = (yy - dstYOffset) * maskBuf->rowBytes + srcCopyXOffset;
      const uint8_t* src_mask = maskBuf->data + maskSrcOff;
      for (int xx = 0; xx < srcCopyLen_y; xx += 2) {
        const int maskV = src_mask[xx];
        if (maskV < 2) {
          continue;
        }

        // chroma doesn't need to be blended for these small masks that we use
        const int xx_half = xx / 2;
        dst_Cb[xx_half] = src_Cb[xx_half];
        dst_Cr[xx_half] = src_Cr[xx_half];
      }
    }
  }
}

} // namespace vcsrender
