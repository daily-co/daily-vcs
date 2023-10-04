#include "../include/canvex_c_api.h"
#include "canvex_skia_executor.h"
#include "canvex_skia_context.h"
#include "skia_includes.h"
#include "time_util.h"
#include <iostream>
#include <cstdio>

namespace canvex {

constexpr int MAX_CANVAS_DIM = 32768;


// enable to print commands when rendering
#define PRINTCMDS 0

#if PRINTCMDS
 #define PRINTCMD_NOARGS(_opname_) \
    std::cout << _opname_ << std::endl;

 #define PRINTCMD_ARGS(_opname_) \
    std::cout << _opname_ << ": "; debugPrintArgs(cmd, std::cout);
#else
 #define PRINTCMD_NOARGS(_opname_)
 #define PRINTCMD_ARGS(_opname_)
#endif


static void debugPrintArgs(const Command& cmd, std::ostream& os) {
  std::string pfix = "";
  for (const auto& arg : cmd.args) {
    os << pfix << arg.type << "|" << arg.numberValue << "|'" << arg.stringValue << "'";
    pfix = " -- ";
  }
  os << std::endl;
}


static void renderDisplayListInSkCanvas(
    const VCSCanvasDisplayList& dl,
    std::shared_ptr<SkCanvas> canvas,
    const std::filesystem::path& resourceDir,
    CanvexSkiaResourceContext* skiaResCtxPtr,
    CanvexExecutionStats* stats // optional stats
  ) {
  // accumulated stats
  double timeSpent_imageLoading_s = 0.0;
  double timeSpent_drawImage_s = 0.0;
  double timeSpent_drawShapes_s = 0.0;
  double timeSpent_drawText_s = 0.0;
  int numImageCacheMisses = 0;

  canvas->clear(SK_ColorTRANSPARENT);

  const auto canvasSize = canvas->getBaseLayerSize();

  // check display list's encoded w/h and scale Skia context accordingly so that rendering fills given buffer.
  // if dl's size is zero, assume caller doesn't want this output scaling.
  if (dl.width > 0 && dl.height > 0
    && (dl.width != (int)canvasSize.width() || dl.width != (int)canvasSize.height())) {
    double scaleX = canvasSize.width() / (double)dl.width;
    double scaleY = canvasSize.height() / (double)dl.height;
    canvas->scale(scaleX, scaleY);
  }

  std::unique_ptr<CanvexSkiaResourceContext> tempResCtxPtr;
  if (!skiaResCtxPtr) {
    // if a cached resource context wasn't passed in, create one now for this call
    tempResCtxPtr = std::make_unique<CanvexSkiaResourceContext>();
    std::cout << __func__
        << ": No Skia resource context from caller (this prevents resource reuse between calls)" << std::endl;
  }

  CanvexContext ctx(canvas, resourceDir, (skiaResCtxPtr) ? *skiaResCtxPtr : *tempResCtxPtr);

  // basic status tracking
  int numInvalidArgErrors = 0;
  int numCmds = 0;

  for (const auto& cmd : dl.cmds) {
    switch (cmd.op) {
      default:
        std::cout << "Warning: unhandled canvas op: " << cmd.op << std::endl;
        break;

      case save: {
        PRINTCMD_NOARGS("save")
        ctx.save();
        numCmds++;
        break;
      }
      case restore: {
        PRINTCMD_NOARGS("restore")
        ctx.restore();
        numCmds++;
        break;
      }
      case scale: {
        PRINTCMD_ARGS("scale")
        // TODO: implement
        break;
      }
      case rotate: {
        PRINTCMD_ARGS("rotate")
        if (cmd.args.size() != 1 || cmd.args[0].type != ArgType::number) {
          std::cout << "Invalid arg for rotate: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.rotate(cmd.args[0].numberValue);
          numCmds++;
        }
        break;
      }
      case translate: {
        PRINTCMD_ARGS("translate")
        // TODO: implement
        break;
      }
      case fillStyle: {
        PRINTCMD_ARGS("fillStyle")
        if (cmd.args.size() != 1 || cmd.args[0].type != ArgType::string) {
          std::cout << "Invalid arg for fillStyle: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.setFillStyle(cmd.args[0].stringValue);
          numCmds++;
        }
        break;
      }
      case strokeStyle: {
        PRINTCMD_ARGS("strokeStyle")
        if (cmd.args.size() != 1 || cmd.args[0].type != ArgType::string) {
          std::cout << "Invalid arg for strokeStyle: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.setStrokeStyle(cmd.args[0].stringValue);
          numCmds++;
        }
        break;
      }
      case lineWidth: {
        PRINTCMD_ARGS("lineWidth")
        if (cmd.args.size() != 1 || cmd.args[0].type != ArgType::number) {
          std::cout << "Invalid args for lineWidth: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.setLineWidth(cmd.args[0].numberValue);
          numCmds++;
        }
        break;
      }
      case lineJoin: {
        PRINTCMD_ARGS("lineJoin")
        if (cmd.args.size() != 1 || cmd.args[0].type != ArgType::string) {
          std::cout << "Invalid args for lineJoin: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          auto& str = cmd.args[0].stringValue;
          JoinType join = MITER;
          if (str == "bevel") join = BEVEL;
          else if (str == "round") join = ROUND;
          //std::cout << "Setting join " << (int)join << " from " << str << std::endl;
          ctx.setLineJoin(join);
          numCmds++;
        }
        break;
      }
      case globalAlpha: {
        PRINTCMD_ARGS("globalAlpha")
        if (cmd.args.size() != 1 || cmd.args[0].type != ArgType::number) {
          std::cout << "Invalid args for globalAlpha: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.setGlobalAlpha(cmd.args[0].numberValue);
          numCmds++;
        }
        break;
      }
      case font: {
        PRINTCMD_ARGS("font")
        if (cmd.args.size() != 4
           || (cmd.args[0].type != ArgType::string && cmd.args[0].type != ArgType::number)
           || cmd.args[1].type != ArgType::string
           || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::string) {
          std::cout << "Invalid args for font: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.setFont(cmd.args[0].stringValue, cmd.args[1].stringValue, cmd.args[2].numberValue, cmd.args[3].stringValue);
          numCmds++;
        }
        break;
      }
      case beginPath: {
        PRINTCMD_ARGS("beginPath")
        ctx.beginPath();
        numCmds++;
        break;
      }
      case closePath: {
        PRINTCMD_ARGS("closePath")
        ctx.closePath();
        numCmds++;
        break;
      }
      case moveTo: {
        PRINTCMD_ARGS("moveTo")
        if (cmd.args.size() != 2 || cmd.args[0].type != ArgType::number
           || cmd.args[1].type != ArgType::number) {
          std::cout << "Invalid args for moveTo: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.moveTo(cmd.args[0].numberValue, cmd.args[1].numberValue);
          numCmds++;
        }
        break;
      }
      case lineTo: {
        PRINTCMD_ARGS("lineTo")
        if (cmd.args.size() != 2 || cmd.args[0].type != ArgType::number
           || cmd.args[1].type != ArgType::number) {
          std::cout << "Invalid args for lineTo: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.lineTo(cmd.args[0].numberValue, cmd.args[1].numberValue);
          numCmds++;
        }
        break;
      }
      case quadraticCurveTo: {
        PRINTCMD_ARGS("quadraticCurveTo")
        if (cmd.args.size() != 4 || cmd.args[0].type != ArgType::number
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::number) {
          std::cout << "Invalid args for quadraticCurveTo: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.quadraticCurveTo(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue);
          numCmds++;
        }
        break;
      }
      case arcTo: {
        PRINTCMD_ARGS("arcTo")
        if (cmd.args.size() != 5 || cmd.args[0].type != ArgType::number
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::number || cmd.args[4].type != ArgType::number) {
          std::cout << "Invalid args for arcTo: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          ctx.arcTo(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue,
                    cmd.args[3].numberValue, cmd.args[4].numberValue);
          numCmds++;
        }
        break;
      }
      case clip: {
        PRINTCMD_ARGS("clip")
        if (cmd.args.size() > 1 ||
          (cmd.args.size() == 1 && cmd.args[0].type != ArgType::string)) {
          std::cout << "Invalid args for clip: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        }
        auto fillRule = FillRuleType::NONZERO;
        if (cmd.args.size() == 1) {
          if (cmd.args[0].stringValue == "evenodd") {
            fillRule = FillRuleType::EVENODD;
          }
        }
        ctx.clip(fillRule);
        numCmds++;
        break;
      }
      case fill: {
        PRINTCMD_ARGS("fill")
        double ts = getMonotonicTime();

        ctx.fill();

        timeSpent_drawShapes_s += getMonotonicTime() - ts;
        numCmds++;
        break;
      }
      case stroke: {
        PRINTCMD_ARGS("stroke")
        double ts = getMonotonicTime();

        ctx.stroke();

        timeSpent_drawShapes_s += getMonotonicTime() - ts;
        numCmds++;
        break;
      }
      case fillRect: {
        PRINTCMD_ARGS("fillRect")
        if (cmd.args.size() != 4 || cmd.args[0].type != ArgType::number
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::number) {
          std::cout << "Invalid args for fillRect: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          double ts = getMonotonicTime();

          ctx.fillRect(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue);

          timeSpent_drawShapes_s += getMonotonicTime() - ts;
          numCmds++;
        }
        break;
      }
      case strokeRect: {
        PRINTCMD_ARGS("strokeRect")
        if (cmd.args.size() != 4 || cmd.args[0].type != ArgType::number
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::number) {
          std::cout << "Invalid args for strokeRect: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          double ts = getMonotonicTime();

          ctx.strokeRect(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue);

          timeSpent_drawShapes_s += getMonotonicTime() - ts;
          numCmds++;
        }
        break;
      }
      case rect: {
        PRINTCMD_ARGS("rect")
        if (cmd.args.size() != 4 || cmd.args[0].type != ArgType::number
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::number) {
          std::cout << "Invalid args for rect: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          double ts = getMonotonicTime();

          ctx.rect(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue);

          timeSpent_drawShapes_s += getMonotonicTime() - ts;
          numCmds++;
        }
        break;
      }
      case fillText: {
        PRINTCMD_ARGS("fillText")
        if (cmd.args.size() != 3 || cmd.args[0].type != ArgType::string
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number) {
          std::cout << "Invalid args for fillText: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          double ts = getMonotonicTime();

          ctx.fillText(cmd.args[0].stringValue, cmd.args[1].numberValue, cmd.args[2].numberValue);

          timeSpent_drawText_s += getMonotonicTime() - ts;
          numCmds++;
        }
        break;
      }
      case strokeText: {
        PRINTCMD_ARGS("strokeText")
        if (cmd.args.size() != 3 || cmd.args[0].type != ArgType::string
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number) {
          std::cout << "Invalid args for strokeText: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else {
          double ts = getMonotonicTime();

          ctx.strokeText(cmd.args[0].stringValue, cmd.args[1].numberValue, cmd.args[2].numberValue);

          timeSpent_drawText_s += getMonotonicTime() - ts;
          numCmds++;
        }
        break;
      }
      case drawImage: {
        PRINTCMD_ARGS("drawImage")
        if (cmd.args.size() < 5 || cmd.args[0].type != ArgType::assetRef
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::number || cmd.args[4].type != ArgType::number) {
          std::cout << "Invalid args for drawImage: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else if (!cmd.args[0].assetRefValue || cmd.args[0].assetRefValue->second.empty()) {
          std::cout << "Invalid assetRef for drawImage, has_value=" << cmd.args[0].assetRefValue.has_value() << std::endl;
          numInvalidArgErrors++;
        } else {
          auto& imgTypeStr = cmd.args[0].assetRefValue->first;
          std::string imgName = cmd.args[0].assetRefValue->second;

          ImageSourceType srcType;
          if (imgTypeStr == "defaultAsset") {
            srcType = ImageSourceType::DefaultAsset;
          } else if (imgTypeStr == "compositionAsset") {
            srcType = ImageSourceType::CompositionAsset;
          } else if (imgTypeStr == "liveAsset") {
            // the imgName argument may have an extra hash value to force an update on the React side.
            // remove anything after the # sign.
            auto hashIdx = imgName.find_last_of('#');
            if (hashIdx != std::string::npos) {
              imgName = imgName.substr(0, hashIdx);
            }
            srcType = ImageSourceType::LiveAsset;
          } else {
            std::cout << "Unknown type string for drawImage: " << imgTypeStr << std::endl;
            // default to composition asset
            srcType = ImageSourceType::CompositionAsset;
          }

          DrawImageStats drawImageStats{};
          
          // drawImage has two argument formats that we support:
          // - 5-argument version with srcDrawable + 4 dstRect coords
          // - 9-argument version with srcDrawable + 4 srcRect coords + 4 dstRect coords
          if (cmd.args.size() < 9) {
            ctx.drawImage(srcType, imgName,
              cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue, cmd.args[4].numberValue,
              &drawImageStats);
          } else {
            ctx.drawImageWithSrcCoords(srcType, imgName,
              cmd.args[5].numberValue, cmd.args[6].numberValue, cmd.args[7].numberValue, cmd.args[8].numberValue,
              cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue, cmd.args[4].numberValue,
              &drawImageStats);
          }

          timeSpent_drawImage_s += drawImageStats.timeSpent_skiaDraw_s;
          timeSpent_imageLoading_s += drawImageStats.timeSpent_imageLoad_s;
          if (drawImageStats.wasCacheMiss) numImageCacheMisses++;

          numCmds++;
        }

        break;
      }
    }
  }

  if (stats) {
    stats->render_detail_image_loading_us = timeSpent_imageLoading_s * 1.0e6;
    stats->render_detail_draw_image_us = timeSpent_drawImage_s * 1.0e6;
    stats->render_detail_draw_shapes_us = timeSpent_drawShapes_s * 1.0e6;
    stats->render_detail_draw_text_us = timeSpent_drawText_s * 1.0e6;
    stats->num_cmds = numCmds;
    stats->num_invalid_arg_errors = numInvalidArgErrors;
    stats->num_image_cache_misses = numImageCacheMisses;
  }
}


static bool writeBitmapToPNG(SkBitmap& bitmap, const std::string& file) {
  sk_sp<SkData> pngData;
  try {
    auto image = SkImage::MakeFromBitmap(bitmap);
    pngData = image->encodeToData(SkEncodedImageFormat::kPNG, 100);
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


bool RenderDisplayListToPNG(
  const VCSCanvasDisplayList& dl,
  const std::filesystem::path& dstFile,
  const std::filesystem::path& resourceDir,
  CanvexSkiaResourceContext* skiaResCtx, // optional cache between calls
  CanvexExecutionStats* stats // optional stats
) {
  const auto w = dl.width;
  const auto h = dl.height;
  if (w < 1 || h < 1) {
    throw new std::runtime_error("Display list canvas width/height is zero");
  }
  if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
    throw new std::runtime_error("Display list canvas width/height exceeds sanity maximum");
  }

  //double t0 = getMonotonicTime();

  SkBitmap bitmap;
  bitmap.allocPixels(SkImageInfo::MakeN32Premul(w, h));

  auto canvas = std::make_shared<SkCanvas>(bitmap);

  double t1 = getMonotonicTime();

  renderDisplayListInSkCanvas(dl, canvas, resourceDir, skiaResCtx, stats);

  double t2 = getMonotonicTime();

  bool ok = true;
  if (!dstFile.empty()) {
    ok = writeBitmapToPNG(bitmap, dstFile.string());
  }

  double t3 = getMonotonicTime();
  if (stats) {
    stats->render_total_us = (t2 - t1) * 1.0e6;
    stats->file_write_us = (t3 - t2) * 1.0e6;
  }
  return ok;
}

bool RenderDisplayListToRawBuffer(
  const VCSCanvasDisplayList& dl,
  const RenderFormat format,
  uint8_t *imageBuffer,
  uint32_t w,
  uint32_t h,
  uint32_t rowBytes,
  CanvexAlphaMode alphaMode,
  const std::filesystem::path& resourceDir,
  CanvexSkiaResourceContext* skiaResCtx, // optional cache between calls
  CanvexExecutionStats* stats // optional stats
) {
  SkColorType skFormat;
  SkImageInfo imageInfo;

  switch (format) {
    default:
    case Rgba:
      skFormat = kRGBA_8888_SkColorType;
      break;

    case Bgra:
      skFormat = kBGRA_8888_SkColorType;
      break;
  }

  switch (alphaMode) {
    case CanvexAlphaMode::CANVEX_PREMULTIPLIED:
      imageInfo = SkImageInfo::Make(w, h, skFormat, kPremul_SkAlphaType);
      break;

    case CanvexAlphaMode::CANVEX_NON_PREMULTIPLIED:
      imageInfo = SkImageInfo::Make(w, h, skFormat, kUnpremul_SkAlphaType);
      break;
  }

  std::shared_ptr<SkCanvas> canvas = SkCanvas::MakeRasterDirect(imageInfo, imageBuffer, rowBytes);

  double t1 = getMonotonicTime();

  renderDisplayListInSkCanvas(dl, canvas, resourceDir, skiaResCtx, stats);

  double t2 = getMonotonicTime();
  if (stats) {
    stats->render_total_us = (t2 - t1) * 1.0e6;
  }

  return true;
}

} // namespace canvex
