#include "fileseq_util.h"

std::pair<std::string, int> getFilenameSeqPattern(const std::filesystem::path& path) {
  auto filename = path.stem().string();

  auto idx = filename.find_last_of("_");
  if (idx == std::string::npos || idx == filename.size() - 1) {
    throw std::runtime_error("Sequence filename not in expected format");
  }
  auto pattern = filename.substr(0, idx + 1);
  int numDigits = filename.size() - idx - 1;

  return std::make_pair(pattern, numDigits);
}
