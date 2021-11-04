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

static void debugPrintArgs(const Command& cmd, std::ostream& os) {
  std::string pfix = "";
  for (const auto& arg : cmd.args) {
    os << pfix << arg.type << "|" << arg.numberValue << "|'" << arg.stringValue << "'";
    pfix = " -- ";
  }
  os << std::endl;
}


static void renderDisplayListInBitmap(const VCSCanvasDisplayList& dl, SkBitmap& bitmap) {
  auto canvas = std::make_shared<SkCanvas>(bitmap);

  canvas->clear(SK_ColorTRANSPARENT);

  CanvexContext ctx(canvas);

  // basic status tracking
  int numInvalidArgErrors = 0;
  int numCmds = 0;

  for (const auto& cmd : dl.cmds) {
    switch (cmd.op) {
      default:
        std::cout << "Warning: unhandled canvas op: " << cmd.op << std::endl;
        break;

      case save: {
#if PRINTCMDS
        std::cout << "save" << std::endl;
#endif
        ctx.save();
        numCmds++;
        break;
      }
      case restore: {
#if PRINTCMDS
        std::cout << "restore" << std::endl;
#endif
        ctx.restore();
        numCmds++;
        break;
      }
      case fillStyle: {
#if PRINTCMDS
        std::cout << "fillStyle: "; debugPrintArgs(cmd, std::cout);
#endif
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
#if PRINTCMDS
        std::cout << "font: "; debugPrintArgs(cmd, std::cout);
#endif
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
#if PRINTCMDS
        std::cout << "clip: "; debugPrintArgs(cmd, std::cout);
#endif
        // TODO: implement clip
        break;
      }
      case fillRect: {
#if PRINTCMDS
        std::cout << "fillRect: "; debugPrintArgs(cmd, std::cout);
#endif
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
#if PRINTCMDS
        std::cout << "fillText: "; debugPrintArgs(cmd, std::cout);
#endif
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
#if PRINTCMDS
        std::cout << "drawImage: "; debugPrintArgs(cmd, std::cout);
#endif
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

  //double t0 = getMonotonicTime();

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

} // namespace canvex
