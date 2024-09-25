#pragma once
#include <deque>
#include <memory>
#include <tuple>


namespace vcsrender {

struct AlphaBuf {
  uint32_t w;
  uint32_t h;
  uint32_t rowBytes;
  uint8_t* data;

  AlphaBuf(uint32_t a_w, uint32_t a_h, bool dense = false)
  : w(a_w), h(a_h) {
    rowBytes = w;
    if (!dense) {
      // round up rowbytes to a multiple of 16
      rowBytes = (rowBytes + 15) & (~15);
    }

    data = new uint8_t[rowBytes * h];
  }

  ~AlphaBuf() {
    delete [] data;
  }
};

class MaskCache {
 public:
  MaskCache();

  std::shared_ptr<AlphaBuf> getCachedMask(uint32_t w, uint32_t h, uint32_t cornerRadius);

private:
  size_t capacity_;

  using MaskCacheKey = std::tuple<uint32_t, uint32_t, uint32_t>;  // width, height, cornerRadius
  using CachedMaskBuf = std::pair<MaskCacheKey, std::shared_ptr<AlphaBuf>>;

  std::deque<CachedMaskBuf> maskBufs_;
};

} // namespace vcsrender
