#pragma once
#include <filesystem>
#include <vector>


namespace vcsrender {

struct SceneJsonFrame {
  size_t index = 0;
  bool hasVl = false;
  bool hasFg = false;
};

struct SceneDescAtFrame {
  size_t index;
  std::unique_ptr<std::string> json_vl;
  std::unique_ptr<std::string> json_fg;
  double layerScale = 1.0;
};

class SceneJsonSequence {
 public:
  static std::unique_ptr<SceneJsonSequence> createFromDir(std::string dir);

  SceneJsonSequence(
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

  size_t getMaxFrameIndex() const noexcept {
    return frames_.size() > 0 ? frames_.back().index : 0;
  }

  SceneDescAtFrame readJsonForFrame(size_t frame);

 private:
  std::filesystem::path dir_;
  std::string fileRoot_;
  int numDigits_;
  std::string fileExt_;
  std::string fileRootWithoutId_;

  std::vector<SceneJsonFrame> frames_;

  void load_();

  std::unique_ptr<std::string> readJsonWithFileId(size_t frameIdx, const std::string& fileId);
};

} // namespace vcsrender
