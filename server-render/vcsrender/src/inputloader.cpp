#include "inputloader.h"

namespace vcsrender {

bool VideoInputLoader::start() {
  // this method is provided as a place to validate paths, preallocate, etc.
  // currently just initializes the render loop.
  frameCursor_ = 0;
  evCursor_ = 0;

  return true;
}

VideoInputBufsById VideoInputLoader::readInputBufsAtFrame(size_t frame) {
  if (frame < frameCursor_) {
    throw std::runtime_error("Input loader can't load frames backwards");
  }

  auto& evs = timingsDesc_.playbackEvents;

  // we know that playbackEvents are sorted in ascending frame order,
  // so we can find the next event by keeping a simple cursor
  VideoInputPlaybackEvent* nextEv;
  do {
    nextEv = (evs.size() > evCursor_) ? &(evs[evCursor_]) : nullptr;
    if (nextEv) {
      if (nextEv->frameIndex <= frame) {
        std::cout << "Applying video playback event idx " << evCursor_ << " at " << frame
                  << ", inputid = " << nextEv->videoInputId << std::endl;
        startPlaybackForEvent_(nextEv);
        evCursor_++;
      } else {
        nextEv = nullptr;
      }
    }
  } while (nextEv);

  VideoInputBufsById bufsById {};
  std::vector<uint32_t> removeList {};

  for (const auto& kv : activeImageSeqsByInputId_) {
    uint32_t videoInputId = kv.first;
    const auto& v = kv.second;

    // check if out time is reached (i.e. playback has ended)
    size_t outFrame = v.startFrame + v.duration;
    if (frame >= outFrame) {
      std::cout << "-- Sequence has ended for input " << videoInputId << " at frame " << frame << std::endl;
      removeList.push_back(videoInputId);
    } else {
      // still going
      size_t frameInSeq = frame - v.startFrame;

      std::cout << "Reading " << frameInSeq << " for input " << videoInputId << std::endl;

      bufsById[videoInputId] = v.imSeq->readYuv420ForFrame(frameInSeq);
    }
  }

  for (const uint32_t id : removeList) {
    activeImageSeqsByInputId_.erase(id);
  }

  return bufsById;
}

void VideoInputLoader::startPlaybackForEvent_(VideoInputPlaybackEvent* ev) {
  std::shared_ptr<ImageSequence> imSeq = ImageSequence::createFromDir(ev->seqDir, ev->w, ev->h);

  activeImageSeqsByInputId_[ev->videoInputId] = {
    imSeq,
    ev->frameIndex,
    ev->durationInFrames
  };
  std::cout << "  ... loaded input " << ev->videoInputId << " imseq from " << ev->seqDir << std::endl;
}



} // namespace vcsrender