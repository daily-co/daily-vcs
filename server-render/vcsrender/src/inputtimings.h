#pragma once
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>
#include <filesystem>

namespace vcsrender {

/*
  Provides C++ types for the "input timings" data written out by vcs-cut
  to describe where clips start and stop on a timeline.

  An example of the format:

  {
  "durationInFrames": 1668,
  "playbackEvents": [
    {
      "frame": 72,
      "videoInputId": 1001,
      "durationInFrames": 72,
      "clipId": "s1",
      "seqDir": "/Users/pauli/Documents/daily/ffmpeg-scripts/cut-tmp/s1"
    },
    {
      "frame": 216,
      "videoInputId": 1002,
      "durationInFrames": 192,
      "clipId": "s2",
      "seqDir": "/Users/pauli/Documents/daily/ffmpeg-scripts/cut-tmp/s2"
    },
    ...


  NOTE: playbackEvents are expected to be already sorted by frame index
  by vcs-cut when writing the file.
*/

struct VideoInputPlaybackEvent {
  size_t frameIndex;
  size_t durationInFrames;
  uint32_t videoInputId;
  std::string seqDir;
  uint32_t w;
  uint32_t h;
  // we ignore "clipId" from the JSON, it's metadata for vcs-cut
};

struct VCSVideoInputTimingsDesc {
  size_t durationInFrames;
  std::vector<VideoInputPlaybackEvent> playbackEvents;
};

} // namespace vcsrender
