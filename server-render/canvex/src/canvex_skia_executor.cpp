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
    const std::filesystem::path& resourceDir
  ) {
  canvas->clear(SK_ColorTRANSPARENT);

  CanvexContext ctx(canvas, resourceDir);

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
      case clip: {
        PRINTCMD_ARGS("clip")
        // TODO: implement clip
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
          // TODO: handle other values for 'type' than 'assetImage'
          auto& imgType = cmd.args[0].assetRefValue->first;
          auto& imgName = cmd.args[0].assetRefValue->second;
          if (imgType == "assetImage") {
            std::cout << "Drawing asset image: " << imgName << std::endl;      
            ctx.drawImage_fromAssets(imgName,
              cmd.args[1].numberValue, cmd.args[2].numberValue, cmd.args[3].numberValue, cmd.args[4].numberValue);
          } else {
            std::cout << "Invalid type for drawImage asset: " << imgType << std::endl;
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

  //double t0 = getMonotonicTime();

  SkBitmap bitmap;
  bitmap.allocPixels(SkImageInfo::MakeN32Premul(w, h));

  auto canvas = std::make_shared<SkCanvas>(bitmap);

  double t1 = getMonotonicTime();

  renderDisplayListInSkCanvas(dl, canvas, resourceDir);

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

bool RenderDisplayListToRGBABuffer(
  const VCSCanvasDisplayList& dl,
  uint8_t *imageBuffer,
  uint32_t w,
  uint32_t h,
  uint32_t rowBytes,
  const std::filesystem::path& resourceDir,
  GraphicsExecutionStats* stats  // optional stats
) {
  // TODO: check display list's encoded w/h and scale Skia context accordingly
  // so that rendering fills given buffer?

  auto imageInfo = SkImageInfo::Make(w, h, kRGBA_8888_SkColorType, kPremul_SkAlphaType);
  std::shared_ptr<SkCanvas> canvas = SkCanvas::MakeRasterDirect(imageInfo, imageBuffer, rowBytes);

  renderDisplayListInSkCanvas(dl, canvas, resourceDir);

  // TODO: collect stats in this call too (refactor from above)

  return true;
}

} // namespace canvex
