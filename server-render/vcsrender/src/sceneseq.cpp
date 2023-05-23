#include "sceneseq.h"
#include <iostream>
#include <sstream>
#include <set>
#include "fileseq_util.h"
#include "file_util.h"

namespace vcsrender {

std::unique_ptr<SceneJsonSequence> SceneJsonSequence::createFromDir(std::string inputSeqDir) {
  const std::filesystem::path dir{inputSeqDir};

  // look for file extension and pattern in image seq dir files
  std::string ext;
  std::string pattern;
  int numDigits = 0;

  for (auto const& entry : std::filesystem::directory_iterator{dir}) {
    auto path = entry.path();
    ext = path.extension().string().substr(1);
    if (ext != "json") continue;

    std::tie(pattern, numDigits) = getFilenameSeqPattern(path);

    std::cout << "Scene JSON seq file pattern is: " << pattern << ", ext: " << ext << ", numDigits: " << numDigits << std::endl;
    break;
  }

  if (numDigits == 0) {
    throw std::runtime_error("Scene JSON sequence file name format not valid");
  }

  auto seq = std::make_unique<SceneJsonSequence>(dir, pattern, numDigits, ext);

  return seq;
}

void SceneJsonSequence::load_() {
  std::cout << "scene json sequence init: " << dir_ << std::endl;

  // files must match the strict format where a two-letter id ("vl" or "fg")
  // is prefixed with an underscore just before the frame number.
  fileRootWithoutId_ = fileRoot_.substr(0, fileRoot_.size() - 3);

  // set is sorted by default.
  // we're assuming the frame numbers in sequence files contain zero padding so that alpha sorting works.
  std::set<std::filesystem::path> sortedFiles;

  for (auto const& entry : std::filesystem::directory_iterator{dir_}) {
    auto path = entry.path();
    auto ext = path.extension().string().substr(1);
    if (ext != fileExt_) continue;

    sortedFiles.insert(path);
  }

  for (auto const& path : sortedFiles) {
    auto filename = path.stem().string();
    auto fileId = filename.substr(fileRootWithoutId_.size(), 2);
    size_t frameIdx = std::stoi(filename.substr(filename.size() - numDigits_, numDigits_));
    std::cout << "JSON file: " << filename << ", " << fileId << std::endl;

    if (frameIdx < 0) {
      std::cerr << "Invalid frame index in sequence: " << frameIdx << std::endl;
      continue;
    }
    if (fileId != "vl" && fileId != "fg") {
      std::cerr << "Unknown JSON file in sequence: " << filename << std::endl;
      continue;
    }

    std::cout << "Reading " << fileId << " for frame " << frameIdx << std::endl;

    SceneJsonFrame* framePtr = nullptr;
    for (auto& frame : frames_) {
      if (frame.index == frameIdx) {
        framePtr = &frame;
        break;
      }
    }
    if (!framePtr) {
      framePtr = &(frames_.emplace_back(SceneJsonFrame{frameIdx, false, false}));
      std::cout << "Created new frame, count now " << frames_.size() << std::endl;
    }

    if (fileId == "vl") {
      framePtr->hasVl = true;
    } else {
      framePtr->hasFg = true;
    }
   }
   std::cout << "Loaded JSON sequence frame count: " << frames_.size() << std::endl;
}

SceneDescAtFrame SceneJsonSequence::readJsonForFrame(size_t frameIdx) {
  SceneDescAtFrame desc{frameIdx, nullptr, nullptr};

  SceneJsonFrame* framePtr = nullptr;
  for (auto& frame : frames_) {
    if (frame.index == frameIdx) {
      framePtr = &frame;
      break;
    }
  }
  if (!framePtr) return desc;

  if (framePtr->hasVl) {
    desc.json_vl = readJsonWithFileId(frameIdx, std::string{"vl"});
  }
  if (framePtr->hasFg) {
    desc.json_fg = readJsonWithFileId(frameIdx, std::string{"fg"});
  }
  return desc;
}

std::unique_ptr<std::string> SceneJsonSequence::readJsonWithFileId(size_t frameIdx, const std::string& fileId) {
  std::stringstream fileNameSs;
  fileNameSs << fileRootWithoutId_ << fileId << "_";
  fileNameSs << std::setfill('0') << std::setw(numDigits_) << frameIdx;
  fileNameSs << "." << fileExt_;

  auto path = dir_ / fileNameSs.str();

  return std::make_unique<std::string>(readTextFile(path.string()));
}

} // namespace vcsrender