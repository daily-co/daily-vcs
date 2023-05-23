#pragma once
#include <filesystem>
#include <memory>

#include "yuvbuf.h"


namespace vcsrender {

class ImageSequence {
 public:
  static std::unique_ptr<ImageSequence> createFromDir(std::string dir, int w, int h);

  // unvalidated metadata for raw sequences
  int w = 0;
  int h = 0;

  ImageSequence(
      std::filesystem::path dir,
      std::string fileRoot,
      int numDigits,
      std::string fileExt)
      : dir_(dir),
        fileRoot_(fileRoot),
        numDigits_(numDigits),
        fileExt_(fileExt) {
    load_();
  }

  size_t getNumberOfFrames() const noexcept {
    return numFrames_;
  }

  std::unique_ptr<vcsrender::Yuv420PlanarBuf> readYuv420ForFrame(size_t frame);

 private:
  std::filesystem::path dir_;
  std::string fileRoot_;
  int numDigits_;
  std::string fileExt_;

  size_t numFrames_;
  bool startsAtOne_;

  void load_();

};

} // namespace vcsrender
