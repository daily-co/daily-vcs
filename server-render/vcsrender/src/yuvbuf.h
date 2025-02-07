#pragma once
#include <algorithm>
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

  Yuv420PlanarBuf(uint32_t a_w, uint32_t a_h, uint8_t* a_data, uint32_t a_rowBytes_y, uint32_t a_rowBytes_ch)
  : w(a_w), h(a_h), data(a_data), rowBytes_y(a_rowBytes_y), rowBytes_ch(a_rowBytes_ch) {
    chromaH = (h + 1) / 2;
    dataSize = calcDataSize();
    ownsData = false;

    /*std::cout << "DEBUG: clearing planarbuf with " << w << "*" << h << ", "
      << rowBytes_y << ", " << rowBytes_ch
      << std::endl;

      memset(getCbData(), 127, rowBytes_ch * chromaH);
      memset(getCrData(), 127, rowBytes_ch * chromaH);
      */
  }

  ~Yuv420PlanarBuf() {
    if (ownsData && data) delete [] data;
  }

  void clearWithBlack() {
    memset(data, 0, rowBytes_y * h);
    memset(getCbData(), 127, rowBytes_ch * chromaH);
    memset(getCrData(), 127, rowBytes_ch * chromaH);
  }

  bool copyFrom(Yuv420PlanarBuf& src) {
    if (src.w != w || src.h != h) {
      return false;
    }
    if (src.rowBytes_y == rowBytes_y) {
      memcpy(data, src.data, src.rowBytes_y * h);
    } else {
      auto rb = std::min(rowBytes_y, src.rowBytes_y);
      for (uint32_t y = 0; y < h; y++) {
        memcpy(data + y * rowBytes_y, src.data + y * src.rowBytes_y, rb);
      }
    }

    if (src.rowBytes_ch == rowBytes_ch) {
      memcpy(getCbData(), src.getConstCbData(), rowBytes_ch * chromaH);
      memcpy(getCrData(), src.getConstCrData(), rowBytes_ch * chromaH);
    } else {
      auto rb = std::min(rowBytes_ch, src.rowBytes_ch);
      uint8_t* dstBuf = getCbData();
      const uint8_t* srcBuf = src.getConstCbData();
      for (uint32_t y = 0; y < h; y++) {
        memcpy(dstBuf + y * rowBytes_ch, srcBuf + y * src.rowBytes_ch, rb);
      }
      dstBuf = getCrData();
      srcBuf = src.getConstCrData();
      for (uint32_t y = 0; y < h; y++) {
        memcpy(dstBuf + y * rowBytes_ch, srcBuf + y * src.rowBytes_ch, rb);
      }
    }
    return true;
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
