#include <algorithm>
#include <iostream>
#include <cstdio>
#include <filesystem>
#include "libyuv.h"
#include "canvex_c_api.h"

#include "parse/parse_scenedesc.h"
#include "yuvbuf.h"
#include "yuv_compositor.h"
#include "file_util.h"

using namespace std;
using namespace vcsrender;


int main() {
  std::cout << "vcsrender demo start\n";

  // --- parser example

  std::string videoLayersJson = R"(
      [ {"type":"video","id":45210,"frame":{"x":0,"y":0,"w":960,"h":1080},"attrs":{"scaleMode":"fill"}},
        {"type":"video","id":46724,"frame":{"x":960,"y":100,"w":960,"h":540},"attrs":{"scaleMode":"fill"}} ]
  )";
  auto videoLayers = ParseVCSVideoLayerListJSON(videoLayersJson, {});
  std::cout << "parsed video layers: " << videoLayers->size() << std::endl;
  for (auto& vl : *videoLayers) {
    std::cout << " . .. " << vl.id << ", x = " << vl.frame.x << ", scale = " << vl.attrs.scaleMode << std::endl;
  }

  // --- loader example

  std::string yuvFileName = "example-data/testpattern_956x602.yuv";
  size_t yuvFileSize = 0;

  try {
    yuvFileSize = std::filesystem::file_size(yuvFileName);
    std::cout << "Got file size: " << yuvFileSize << std::endl;
  } catch (std::exception& e) {
    std::cerr << "Couldn't read size: " << yuvFileName << std::endl;
    return 1;
  }

  auto srcBuf = std::make_shared<Yuv420PlanarBuf>(956, 602);

  FILE* yuvFile = fopen(yuvFileName.c_str(), "rb");
  if (1 != fread(srcBuf->data, yuvFileSize, 1, yuvFile)) {
    std::cerr << "Couldn't read file: " << yuvFileName << std::endl;
    return 1;
  }
  fclose(yuvFile);

  std::cout << "Src image size " << srcBuf->w << " * " << srcBuf->h << std::endl;

  if (0) {
    // peek into data
    int tx = 0;
    int ty = 100;
    std::cout << " Y at " << tx << ", " << ty << ": " << (int) srcBuf->data[srcBuf->rowBytes_y * ty + tx] << std::endl;
    std::cout << "Cb at " << tx << ", " << ty << ": " << (int) srcBuf->getCbData()[srcBuf->rowBytes_ch * ty + tx / 2] << std::endl;
    std::cout << "Cr at " << tx << ", " << ty << ": " << (int) srcBuf->getCrData()[srcBuf->rowBytes_ch * ty + tx / 2] << std::endl;

    tx = 200;
    std::cout << " Y at " << tx << ", " << ty << ": " << (int) srcBuf->data[srcBuf->rowBytes_y * ty + tx] << std::endl;
    std::cout << "Cb at " << tx << ", " << ty << ": " << (int) srcBuf->getCbData()[srcBuf->rowBytes_ch * ty + tx / 2] << std::endl;
    std::cout << "Cr at " << tx << ", " << ty << ": " << (int) srcBuf->getCrData()[srcBuf->rowBytes_ch * ty + tx / 2] << std::endl;

    tx = 300;
    std::cout << " Y at " << tx << ", " << ty << ": " << (int) srcBuf->data[srcBuf->rowBytes_y * ty + tx] << std::endl;
    std::cout << "Cb at " << tx << ", " << ty << ": " << (int) srcBuf->getCbData()[srcBuf->rowBytes_ch * ty + tx / 2] << std::endl;
    std::cout << "Cr at " << tx << ", " << ty << ": " << (int) srcBuf->getCrData()[srcBuf->rowBytes_ch * ty + tx / 2] << std::endl;
  }

  Yuv420PlanarBuf dstBuf(640, 320);

  dstBuf.clearWithBlack();

  libyuv::I420Scale(
    srcBuf->data,
    srcBuf->rowBytes_y,
    srcBuf->getCbData(),
    srcBuf->rowBytes_ch,
    srcBuf->getCrData(),
    srcBuf->rowBytes_ch,
    srcBuf->w,
    srcBuf->h,
    
    dstBuf.data,
    dstBuf.rowBytes_y,
    dstBuf.getCbData(),
    dstBuf.rowBytes_ch,
    dstBuf.getCrData(),
    dstBuf.rowBytes_ch,
    dstBuf.w / 3,
    dstBuf.h / 3,

    libyuv::kFilterBilinear
  );

  std::cout << "Scaled to " << dstBuf.w << " * " << dstBuf.h << std::endl;

  std::string dstFileName = "demo_output.yuv";

  FILE* dstFile = fopen(dstFileName.c_str(), "wb");
  fwrite(dstBuf.data, dstBuf.dataSize, 1, dstFile);
  fclose(dstFile);


  // --- compositor

  std::cout << "Starting compositor test" << std::endl;

  int compW = 1920, compH = 1080;
  YuvCompositor comp(compW, compH, "");

  comp.setVideoLayersJSON(videoLayersJson);
  
  comp.setFgDisplayListJSON(readTextFile("subprojects/canvex/example-data/rounded-sidebar.json"));

  VideoInputBufsById inputBufs {};
  inputBufs[45210] = srcBuf;
  inputBufs[46724] = srcBuf;

  std::cout << "rendering..." << std::endl;

  auto renderResult = comp.renderFrame(0, inputBufs);

  std::cout << "writing..." << std::endl;

  dstFileName = "demo_comp_output_1920_1080.yuv";
  dstFile = fopen(dstFileName.c_str(), "wb");
  fwrite(renderResult->data, renderResult->dataSize, 1, dstFile);
  fclose(dstFile);

  std::cout << "done." << std::endl;

  return 0;
}
