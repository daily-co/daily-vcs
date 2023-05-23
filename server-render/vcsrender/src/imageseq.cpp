#include "imageseq.h"
#include <iostream>
#include <sstream>
#include "fileseq_util.h"

namespace vcsrender {

std::unique_ptr<ImageSequence> ImageSequence::createFromDir(std::string inputSeqDir, int w, int h) {
  const std::filesystem::path dir{inputSeqDir};

  // look for file extension and pattern in image seq dir files
  std::string ext;
  std::string pattern;
  int numDigits = 0;

  for (auto const& entry : std::filesystem::directory_iterator{dir}) {
    auto path = entry.path();
    ext = path.extension().string().substr(1);

    // only supports raw YUV buffers currently
    if (ext != "yuv") continue;

    std::tie(pattern, numDigits) = getFilenameSeqPattern(path);

    std::cout << "Image seq file pattern is: " << pattern << ", ext: " << ext << ", numDigits: " << numDigits << std::endl;
    break;
  }

  if (numDigits == 0) {
    throw std::runtime_error("Image sequence file name format not valid");
  }

  auto seq = std::make_unique<ImageSequence>(dir, pattern, numDigits, ext);

  seq->w = w;
  seq->h = h;

  return seq;
}

void ImageSequence::load_() {
  std::cout << "image sequence init: " << dir_ << std::endl;

  // discover available frames
  const size_t kSanityMaxFrames = 10000;
  numFrames_ = 0;
  startsAtOne_ = false;

  while (numFrames_ < kSanityMaxFrames) {
    size_t frameIdx = (startsAtOne_) ? numFrames_ + 1 : numFrames_;

    std::stringstream fileNameSs;
    fileNameSs << fileRoot_;
    fileNameSs << std::setfill('0') << std::setw(numDigits_) << frameIdx;
    fileNameSs << "." << fileExt_;

    auto path = dir_ / fileNameSs.str();

    try {
      auto fstat = std::filesystem::status(path);
      if (std::filesystem::is_regular_file(fstat)) {
        numFrames_++;
        continue;
      }
    } catch (std::filesystem::filesystem_error& e) {
    }
    // file doesn't exist if we end up here.
    if (numFrames_ == 0 && !startsAtOne_) {
      // try again starting at one
      startsAtOne_ = true;
    } else {
      break;
    }
  }
  std::cout << "Loaded image sequence frame count: " << numFrames_ << std::endl;
}

std::unique_ptr<vcsrender::Yuv420PlanarBuf> ImageSequence::readYuv420ForFrame(size_t frameIdx) {
  if (frameIdx >= numFrames_) {
    frameIdx %= numFrames_; // loop by default -- this should be a setting
  }

  if (startsAtOne_) frameIdx++;
  
  std::stringstream fileNameSs;
  fileNameSs << fileRoot_;
  fileNameSs << std::setfill('0') << std::setw(numDigits_) << frameIdx;
  fileNameSs << "." << fileExt_;

  auto path = dir_ / fileNameSs.str();

  auto srcBuf = std::make_unique<Yuv420PlanarBuf>(this->w, this->h);

  const auto yuvFileSize = srcBuf->calcDataSize();

  FILE* yuvFile = fopen(path.c_str(), "rb");
  if ( !yuvFile) {
    throw std::runtime_error("Image sequence file can't be loaded");
  }

  if (1 != fread(srcBuf->data, yuvFileSize, 1, yuvFile)) {
    std::cerr << "Couldn't read YUV input file: " << path << std::endl;
    fclose(yuvFile);
    return nullptr;
  }
  fclose(yuvFile);

  return srcBuf;
}

} // namespace vcsrender