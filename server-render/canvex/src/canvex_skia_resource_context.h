#pragma once
#include "skia_includes.h"
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>

namespace canvex {

// Utility for looking up fonts that match the default pattern
// used by Roboto and the other fonts we currently have.
// Defined as a class so that the lookup behavior could be overridden
// by defining a subclass for whatever weird font.
class FontVariantMatcher {
 public:
  FontVariantMatcher(
    const std::string& family,
    const std::unordered_set<int>& weights,
    bool hasItalic,
    const std::string& basename = "",
    const std::string& ext = "ttf")
    : family_(family), weights_(weights), hasItalic_(hasItalic),
      basename_(basename), ext_(ext)
  {
    if (basename_.empty()) {
      basename_ = family_ + "-"; // default pattern for filename
    }
  }

  std::optional<std::string> getFontFileName(const std::string& family, int fontWeight, bool italic) const;

 private:
  std::string family_;
  std::unordered_set<int> weights_;
  bool hasItalic_ = false;
  std::string basename_;
  std::string ext_;
};


using TypefaceCache = std::unordered_map<std::string, sk_sp<SkTypeface>>;
using ImageCache = std::unordered_map<std::string, sk_sp<SkImage>>;


struct CanvexSkiaResourceContext {
  CanvexSkiaResourceContext();

  std::optional<std::string> getFontFileName(const std::string& family, int fontWeight, bool italic);

   std::vector<FontVariantMatcher> fontVariantMatchers;
   TypefaceCache typefaceCache;
   ImageCache imageCache_defaultNamespace;
   ImageCache imageCache_compositionNamespace;
};

} // namespace canvex
