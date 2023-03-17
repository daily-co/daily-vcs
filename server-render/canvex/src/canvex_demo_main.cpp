#include <algorithm>
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
    pngData = image->encodeToData(nullptr, SkEncodedImageFormat::kPNG, 100);
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
        "example-data/rounded-sidebar.json";
        // "example-data/graphics-test-random-50.json";
        //"example-data/basic-labels.json";

  std::cout << "Will read JSON from: " << jsonPath << std::endl;

  const int numIters = 1;
  std::vector<double> stats_parseJson_s;
  std::vector<double> stats_renderTotal_s;

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

    CanvexExecutionStats execStats{};

    auto resourceDir = std::filesystem::current_path() / "../../res";

    RenderDisplayListToPNG(*displayList, "test-dl.png", resourceDir, nullptr, &execStats);

    if (1) {
      stats_parseJson_s.push_back(t_parseJson);
      stats_renderTotal_s.push_back(execStats.render_total_us/1.0e6);

      std::cout << "Frame done. Timings:" << std::endl;
      std::cout << "Parse JSON " << round(t_parseJson*1.0e6)/1000.0 << "ms" << std::endl;
      std::cout << "Graphics execution " << execStats.render_total_us/1000.0 << "ms" << std::endl;
      std::cout << "File write " << execStats.file_write_us/1000.0 << "ms" << std::endl;

      std::cout << "Graphics detail: image loading " << execStats.render_detail_image_loading_us/1000.0 << "ms" << std::endl;
      std::cout << "Graphics detail: drawImage " << execStats.render_detail_draw_image_us/1000.0 << "ms" << std::endl;
      std::cout << "Graphics detail: drawText " << execStats.render_detail_draw_text_us/1000.0 << "ms" << std::endl;
      std::cout << "Graphics detail: drawShapes " << execStats.render_detail_draw_shapes_us/1000.0 << "ms" << std::endl;
      std::cout << "Graphics image cache misses = " << execStats.num_image_cache_misses << std::endl;
    }
  }

  // print stats
  {
    std::sort(stats_parseJson_s.begin(), stats_parseJson_s.end());
    std::sort(stats_renderTotal_s.begin(), stats_renderTotal_s.end());

    const int n = stats_parseJson_s.size();
    const int mid = n / 2;

    std::cout << std::endl;

    std::cout << "parseJson: ";
    std::cout << "median " << (stats_parseJson_s[mid]*1000.0) << " ms, ";
    std::cout << "min " << (stats_parseJson_s[0]*1000.0) << " ms, ";
    std::cout << "max " << (stats_parseJson_s[n - 1]*1000.0) << " ms." << std::endl;

    std::cout << "graphicsRender: ";
    std::cout << "median " << (stats_renderTotal_s[mid]*1000.0) << " ms, ";
    std::cout << "min " << (stats_renderTotal_s[0]*1000.0) << " ms, ";
    std::cout << "max " << (stats_renderTotal_s[n - 1]*1000.0) << " ms." << std::endl;
  }

  return 0;
}
