#pragma once
#include <cstddef>
#include <cstdint>
#include <iostream>

namespace vcsrender {

struct Yuv420PlanarBuf {
  uint32_t w;
  uint32_t h;
  uint8_t* data;
  size_t dataSize;
  bool ownsData;
  uint32_t rowBytes_y;
  uint32_t rowBytes_ch;

  // * Takes ownership of `data` if `release` specified; 
  //   assumes default allocator was used (i.e. will be freed with C++ delete).
  // * Assumes rowBytes == width.
  Yuv420PlanarBuf(uint32_t a_w, uint32_t a_h, uint8_t* a_data, bool a_release)
  : w(a_w), h(a_h), data(a_data), ownsData(a_release) {
    rowBytes_y = w;
    rowBytes_ch = w / 2;
    dataSize = calcDataSize();
  }

  // this constructor allocates new data with the given size.
  Yuv420PlanarBuf(uint32_t a_w, uint32_t a_h)
  : w(a_w), h(a_h) {
    // TODO: could compute upsized rowbytes here for better alignment + cache line use
    rowBytes_y = w;
    rowBytes_ch = w / 2;
    dataSize = calcDataSize();
    data = new uint8_t[dataSize];
    ownsData = true;
  }

  ~Yuv420PlanarBuf() {
    if (ownsData && data) delete data;
  }

  void clearWithBlack() {
    const auto chromaH = h / 2;
    memset(data, 0, rowBytes_y * h);
    memset(getCbData(), 127, rowBytes_ch * chromaH);
    memset(getCrData(), 127, rowBytes_ch * chromaH);
  }

  inline size_t calcDataSize() {
    size_t ySize = rowBytes_y * h;
    size_t chSize = calcChromaPlaneSize();
    return ySize + 2 * chSize;
  }

  inline size_t calcChromaPlaneSize() {
    const auto chromaH = h / 2;
    return rowBytes_ch * chromaH;
  }

  inline uint8_t* getCrData() {
    return data + rowBytes_y * h;  
  }
  inline uint8_t* getCbData() {
    size_t chSize = calcChromaPlaneSize();
    return data + rowBytes_y * h + chSize;
  }
};

using VideoInputBufsById = std::unordered_map<uint32_t, std::shared_ptr<Yuv420PlanarBuf>>;

} // namespace vcsrender
