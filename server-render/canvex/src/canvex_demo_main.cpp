#include <iostream>
#include <cstdio>
#include "skia_includes.h"
#include "canvas_display_list.h"
#include "canvex_skia_executor.h"
#include "file_util.h"
#include "time_util.h"

using namespace std;
using namespace canvex;


void renderTestIntoBitmap(SkBitmap& bitmap, int /*w*/, int /*h*/) {
  SkCanvas canvas(bitmap);

  canvas.drawColor(SkColorSetARGB(255, 50, 60, 120));

  SkPaint paint;
  paint.setStyle(SkPaint::kFill_Style);
  paint.setARGB(255, 255, 255, 255);
  paint.setAntiAlias(true);

  std::string text = "Hello Daily Skia";

  auto typeface = SkTypeface::MakeFromName("Helvetica", {200, SkFontStyle::kNormal_Width, SkFontStyle::kUpright_Slant});

  SkFont font(typeface, 30);

  auto textBlob = SkTextBlob::MakeFromString(text.c_str(), font);

  canvas.drawTextBlob(textBlob, 100, 100, paint);
}

int main() {
  std::cout << "Skia rendering demo\n";

  const int w = 640, h = 360;
  SkBitmap bitmap;
  bitmap.allocPixels(SkImageInfo::MakeN32Premul(w, h));

  renderTestIntoBitmap(bitmap, w, h);

  sk_sp<SkData> pngData;
  try {
    auto image = SkImage::MakeFromBitmap(bitmap);
    pngData = image->encodeToData();
  } catch (std::exception& e) {
    std::cerr << "Unable to encode PNG: "<< e.what() << std::endl;
    return 1;
  }

  std::string outFile = "test.png";

  FILE* pngFile = fopen(outFile.c_str(), "wb");
  fwrite(pngData->bytes(), pngData->size(), 1, pngFile);
  fclose(pngFile);

  // -- json test --
  auto jsonPath = 
        //"example-data/basic-lowerthird.json";
        "example-data/graphics-test-random-50.json";

  std::cout << "Will read JSON from: " << jsonPath << std::endl;

  const int numIters = 20;

  for (int i = 0; i < numIters; i++) {
    const double t0 = getMonotonicTime();

    std::unique_ptr<VCSCanvasDisplayList> displayList;
    try {
      auto json = readTextFile(jsonPath);
      displayList = ParseVCSDisplayListJSON(json);
    } catch (std::exception& e) {
      std::cerr << "Unable to read display list file: "<< e.what() << std::endl;
      return 2;
    }

    const double t_parseJson = getMonotonicTime() - t0;

    GraphicsExecutionStats execStats{};

    RenderDisplayListToPNG(*displayList, "test-dl.png", &execStats);

    std::cout << "Done. Timings:" << std::endl;
    std::cout << "Parse JSON " << round(t_parseJson*1.0e6)/1000.0 << "ms" << std::endl;
    std::cout << "Graphics execution " << execStats.graphicsRender_us/1000.0 << "ms" << std::endl;
    std::cout << "File write " << execStats.fileWrite_us/1000.0 << "ms" << std::endl;
  }
  return 0;
}
