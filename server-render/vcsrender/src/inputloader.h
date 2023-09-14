#pragma once
#include <map>
#include "inputtimings.h"
#include "yuvbuf.h"
#include "imageseq.h"

namespace vcsrender {

struct ActiveImageSeq {
  std::shared_ptr<ImageSequence> imSeq;
  size_t startFrame;
  size_t duration;
};

class VideoInputLoader {
 public:
  VideoInputLoader(VCSVideoInputTimingsDesc& td) : timingsDesc_(td) {}

  // must be called at start of render loop
  bool start();

  // must be called with frames in increasing order.
  // may throw on errors.
  VideoInputBufsById readInputBufsAtFrame(size_t frame);

 private:
  VCSVideoInputTimingsDesc& timingsDesc_;
  size_t frameCursor_;
  size_t evCursor_;

  std::map<uint32_t, ActiveImageSeq> activeImageSeqsByInputId_;

  void startPlaybackForEvent_(VideoInputPlaybackEvent* ev);
};

} // namespace vcsrender