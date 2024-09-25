#include "mask.h"
#include "canvex_c_api.h"
#include <algorithm>
#include <iostream>
#include <cstring>


namespace vcsrender {

MaskCache::MaskCache() {
  capacity_ = 100;
}

std::shared_ptr<AlphaBuf> MaskCache::getCachedMask(uint32_t w, uint32_t h, uint32_t cornerRadius) {
  std::tuple key {w, h, cornerRadius};

  auto it = std::find_if(maskBufs_.begin(), maskBufs_.end(),
                         [&key](const auto& el) { return el.first == key; });

  if (it != std::end(maskBufs_)) {  // already in cache
    //std::cout << "Found cached mask for " << w << " / " << h << " / " << cornerRadius << std::endl;
    auto& el = *it;
    return el.second;
  }

  std::cout << "creating roundrect mask for " << w << " / " << h << " / " << cornerRadius << std::endl;

  auto buf = std::make_shared<AlphaBuf>(w, h);

  // clear to black
  memset(buf->data, 0, buf->rowBytes * buf->h);

  CanvexRenderRoundedRectMask_u8(
    buf->data,
    buf->w,
    buf->h,
    buf->rowBytes,
    0, 0, buf->w, buf->h,
    cornerRadius, cornerRadius, cornerRadius, cornerRadius
  );

  maskBufs_.emplace_back(key, buf);

  if (maskBufs_.size() > capacity_) {
    std::cout << "vcsrender maskcache is full (not expected to happen often, maybe capacity needs to be increased)" << std::endl;
    while (maskBufs_.size() > capacity_) {
      maskBufs_.pop_front();
    }
  }

  return buf;
}

} // namespace vcsrender
