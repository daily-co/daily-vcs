#include <iostream>
#include <cstdio>
#include "skia_includes.h"
#include "canvas_display_list.h"
#include "file_util.h"

using namespace std;
using namespace canvex;


void renderTestIntoBitmap(SkBitmap& bitmap, int w, int h) {
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
  auto jsonPath = "example-data/basic-lowerthird.json";

  std::cout << "Will read JSON from: " << jsonPath << std::endl;

  std::unique_ptr<VCSCanvasDisplayList> displayList;
  try {
    auto json = readTextFile(jsonPath);
    displayList = ParseVCSDisplayListJSON(json);
  } catch (std::exception& e) {
    std::cerr << "Unable to read display list file: "<< e.what() << std::endl;
    return 2;
  }

  

  return 0;
}
