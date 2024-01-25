#pragma once
#include "../inputtimings.h"

namespace vcsrender {

// throws on parse error
std::unique_ptr<VCSVideoInputTimingsDesc> ParseVCSVideoInputTimingsDescJSON(const std::string& str);
std::unique_ptr<VCSVideoInputTimingsDesc> ParseVCSVideoInputTimingsDescJSON(const char* jsonStr);

} // namespace vcsrender
