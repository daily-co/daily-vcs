#pragma once
#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace vcsrender {

/*
  Provides C++ types for the data written out by VCS runner (in video-scenedesc.js).

  The 2D graphics display list is handled by canvex, it's not included here.
  Matching types and functions are in canvex_display_list.h in that project.
  (They are internal to canvex; vcsrender calls through the canvex C API to render.)

  Example data from VCS runner:
  [ {"type":"video","id":45210,"frame":{"x":0,"y":0,"w":960,"h":1080},"attrs":{"scaleMode":"fill"}},
    {"type":"video","id":46724,"frame":{"x":960,"y":0,"w":960,"h":1080},"attrs":{"scaleMode":"fill"}} ]
*/

struct VCSFrame {
  double x = 0.0;
  double y = 0.0;
  double w = 0.0;
  double h = 0.0;
};

enum VCSScaleMode {
  fill = 0,
  fit
};

struct VideoLayerAttrs {
  VCSScaleMode scaleMode = VCSScaleMode::fill;
  double cornerRadiusPx = 0.0;
  double zoomFactor = 1.0;
};

struct VideoLayerDesc {
  uint32_t id = 0;
  VCSFrame frame {};
  VideoLayerAttrs attrs {};

  VideoLayerDesc() {}
};

using VCSVideoLayerList = std::vector<VideoLayerDesc>;

} // namespace vcsrender
