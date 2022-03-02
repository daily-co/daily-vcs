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
    CanvexSkiaResourceContext* skiaResCtxPtr
  ) {
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
      case font: {
        PRINTCMD_ARGS("font")
        if (cmd.args.size() != 4 || cmd.args[0].type != ArgType::string
           || cmd.args[1].type != ArgType::string || cmd.args[2].type != ArgType::number
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
        break;
      }
      case closePath: {
        PRINTCMD_ARGS("closePath")
        ctx.closePath();
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
      case fill: {
        PRINTCMD_ARGS("fill")
        ctx.fill();
        break;
      }
      case stroke: {
        PRINTCMD_ARGS("stroke")
        ctx.stroke();
        break;
      }
      case clip: {
        PRINTCMD_ARGS("clip")
        ctx.clip();
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
          ctx.fillRect(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue);
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
          ctx.strokeRect(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue);
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
          ctx.rect(cmd.args[0].numberValue, cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue);
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
          ctx.fillText(cmd.args[0].stringValue, cmd.args[1].numberValue, cmd.args[2].numberValue);
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
          ctx.strokeText(cmd.args[0].stringValue, cmd.args[1].numberValue, cmd.args[2].numberValue);
          numCmds++;
        }
        break;
      }
      case drawImage: {
        PRINTCMD_ARGS("drawImage")
        if (cmd.args.size() != 5 || cmd.args[0].type != ArgType::assetRef
           || cmd.args[1].type != ArgType::number || cmd.args[2].type != ArgType::number
           || cmd.args[3].type != ArgType::number || cmd.args[4].type != ArgType::number) {
          std::cout << "Invalid args for drawImage: "; debugPrintArgs(cmd, std::cout);
          numInvalidArgErrors++;
        } else if (!cmd.args[0].assetRefValue || cmd.args[0].assetRefValue->second.empty()) {
          std::cout << "Invalid assetRef for drawImage, has_value=" << cmd.args[0].assetRefValue.has_value() << std::endl;
          numInvalidArgErrors++;
        } else {
          auto& imgType = cmd.args[0].assetRefValue->first;
          auto& imgName = cmd.args[0].assetRefValue->second;

          // eventually we'll support other types of images,
          // e.g. compositions can have their own namespace for user-provided assets.
          if (imgType == "defaultAsset") {
            ctx.drawImage_fromDefaultAssets(imgName,
              cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue, cmd.args[4].numberValue);
          } else {
            std::cout << "Unsupported type for drawImage: " << imgType << std::endl;
          }
          numCmds++;
        }

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


bool RenderDisplayListToPNG(
  const VCSCanvasDisplayList& dl,
  const std::filesystem::path& dstFile,
  const std::filesystem::path& resourceDir,
  CanvexSkiaResourceContext* skiaResCtx, // optional cache between calls
  GraphicsExecutionStats* stats // optional stats
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

  renderDisplayListInSkCanvas(dl, canvas, resourceDir, skiaResCtx);

  double t2 = getMonotonicTime();

  bool ok = true;
  if (!dstFile.empty()) {
    ok = writeBitmapToPNG(bitmap, dstFile.string());
  }

  double t3 = getMonotonicTime();
  if (stats) {
    stats->graphicsRender_us = (t2 - t1) * 1.0e6;
    stats->fileWrite_us = (t3 - t2) * 1.0e6;
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
  GraphicsExecutionStats* stats // optional stats
) {
  SkColorType skFormat;
  SkImageInfo imageInfo;

  switch (format) {
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

  renderDisplayListInSkCanvas(dl, canvas, resourceDir, skiaResCtx);

  // TODO: collect stats in this call too (refactor from above)

  return true;
}

} // namespace canvex
