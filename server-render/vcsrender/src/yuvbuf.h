#pragma once
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <memory>
#include <iostream>
#include <unordered_map>

namespace vcsrender {

struct Yuv420PlanarBuf {
  uint32_t w;
  uint32_t h;
  uint8_t* data;
  size_t dataSize;
  bool ownsData;
  uint32_t rowBytes_y;
  uint32_t rowBytes_ch;
  uint32_t chromaH;

  // this constructor allocates new data with the given size.
  // if dense = false, rowBytes will be set so scanlines are aligned for SIMD.
  Yuv420PlanarBuf(uint32_t a_w, uint32_t a_h, bool dense = true)
  : w(a_w), h(a_h) {
    rowBytes_y = w;
    rowBytes_ch = (w + 1) / 2;

    if (!dense) {
      // round up rowbytes to a multiple of 16
      rowBytes_y = (rowBytes_y + 15) & (~15);
      rowBytes_ch = (rowBytes_ch + 15) & (~15);
    }

    chromaH = (h + 1) / 2;
    dataSize = calcDataSize();
    data = new uint8_t[dataSize];
    ownsData = true;
  }

  ~Yuv420PlanarBuf() {
    if (ownsData && data) delete [] data;
  }

  void clearWithBlack() {
    memset(data, 0, rowBytes_y * h);
    memset(getCbData(), 127, rowBytes_ch * chromaH);
    memset(getCrData(), 127, rowBytes_ch * chromaH);
  }

  inline size_t calcDataSize() {
    size_t ySize = rowBytes_y * h;
    size_t chSize = calcChromaPlaneSize();
    return ySize + 2 * chSize;
  }

  inline size_t calcChromaPlaneSize() const {
    return rowBytes_ch * chromaH;
  }

  inline uint8_t* getCrData() {
    return data + rowBytes_y * h;  
  }
  inline const uint8_t* getConstCrData() const {
    return static_cast<const uint8_t*> (data + rowBytes_y * h);
  }

  inline uint8_t* getCbData() {
    size_t chSize = calcChromaPlaneSize();
    return data + rowBytes_y * h + chSize;
  }

  inline const uint8_t* getConstCbData() const {
    size_t chSize = calcChromaPlaneSize();
    return static_cast<const uint8_t*> (data + rowBytes_y * h + chSize);
  }
};

using VideoInputBufsById = std::unordered_map<uint32_t, std::shared_ptr<Yuv420PlanarBuf>>;

} // namespace vcsrender
