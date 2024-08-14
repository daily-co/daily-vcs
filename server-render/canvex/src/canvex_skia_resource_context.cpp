#include "canvex_skia_resource_context.h"

namespace canvex {

std::optional<std::string> FontVariantMatcher::getFontFileName(const std::string& family, int fontWeight, bool italic) const {
  if (family_ == "NotoColorEmoji" && (family == "_emoji" || family == family_)) {
    // no variants for the single emoji font we provide
    return "NotoColorEmoji-Regular.ttf";
  }
  if (family != family_) {
    return std::nullopt;
  }
  std::string s;

  switch (fontWeight) {
    case 100:
      if (weights_.count(100) > 0) {
        s = "Thin"; break;
      } // intentional fallthrough

    case 200:
      if (weights_.count(200) > 0) {
        s = "ExtraLight"; break;
      } // intentional fallthrough

    case 300:
      if (weights_.count(300) > 0) {
        s = "Light"; break;
      } // intentional fallthrough

    default:
    case 400:
      if (weights_.count(400) > 0) {
        s = ""; break; // name is filled out below
      } // intentional fallthrough

    case 500:
      if (weights_.count(500) > 0) {
        s = "Medium"; break;
      } // intentional fallthrough

    case 600:
      if (weights_.count(600) > 0) {
        s = "SemiBold"; break;
      } // intentional fallthrough

    case 700:
      if (weights_.count(700) > 0) {
        s = "Bold"; break;
      } // intentional fallthrough

    case 800:
      if (weights_.count(800) > 0) {
        s = "ExtraBold"; break;
      } // intentional fallthrough

    case 900:
      if (weights_.count(900) > 0) {
        s = "Black"; break;
      } // intentional fallthrough
  }

  if (s.empty()) {
    // the default weight is named differently from the pattern
    s = (italic && hasItalic_) ? "" : "Regular";
  }

  if (italic && hasItalic_) {
    s = s += "Italic";
  }

  return basename_ + s + "." + ext_;
}

CanvexSkiaResourceContext::CanvexSkiaResourceContext() {
  // initialize known standard fonts that are part of the VCS resource setup
  fontVariantMatchers = {
    { "Roboto", {100, 300, 400, 500, 700, 900}, true },
    { "RobotoCondensed", {300, 400, 500, 700}, true },
    { "Anton", {400}, false },
    { "Bangers", {400}, false },
    { "Bitter", {100, 300, 400, 500, 700, 900}, true },
    { "DMSans", {100, 200, 300, 400, 500, 600, 700, 800, 900}, true },
    { "Exo", {100, 300, 400, 500, 700, 900}, true },
    { "Magra", {400, 700}, false },
    { "PermanentMarker", {400}, false },
    { "SuezOne", {400}, false },
    { "Teko", {300, 400, 500, 600, 700}, false },
    { "NotoColorEmoji", {400}, false },
    // -- added for Bolt Foundry --
    { "BebasNeue", {700}, false },
    { "Futura", {700}, false },
    { "KCIllHand", {400}, false },
    { "Lovelo", {700}, false, "", "otf" },
  };
}

std::optional<std::string> CanvexSkiaResourceContext::getFontFileName(const std::string& family, int fontWeight, bool italic) {
  for (const auto& matcher : fontVariantMatchers) {
    auto opt = matcher.getFontFileName(family, fontWeight, italic);
    if (opt.has_value()) {
      return opt;
    }
  }
  return std::nullopt;
}

} // namespace canvex