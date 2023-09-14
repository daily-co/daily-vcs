#pragma once
#include "../scenedesc.h"

namespace vcsrender {

struct VideoLayerParseOptions {
  double scale = 1.0;
};

// throws on parse error
std::unique_ptr<VCSVideoLayerList> ParseVCSVideoLayerListJSON(const std::string& str, VideoLayerParseOptions opts);
std::unique_ptr<VCSVideoLayerList> ParseVCSVideoLayerListJSON(const char* cstr, VideoLayerParseOptions opts);

} // namespace vcsrender
