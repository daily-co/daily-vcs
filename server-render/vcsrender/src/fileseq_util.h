#pragma once
#include <filesystem>
#include <string>
#include <utility>

// throws if filename doesn't match expected format.
// must have an underscore followed by numbers, e.g. "foobar_0123.jpg"
std::pair<std::string, int> getFilenameSeqPattern(const std::filesystem::path& path);
