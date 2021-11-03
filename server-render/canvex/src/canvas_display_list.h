#pragma once
#include <memory>
#include <optional>
#include <string>
#include <tuple>
#include <vector>

/*
  Native command type representing a VCS canvas display list,
  and a utility to parse the JSON format received from VCS JavaScript engine.
*/

namespace canvex {

enum OpType {
  noop = 0,
  save,
  restore,
  fillStyle,
  font,
  clip,
  fillRect,
  fillText,
  drawImage,
  beginPath,
  closePath,
  ellipse,
  moveTo,
  lineTo,
  quadraticCurveTo,
};

enum ArgType {
  number = 0,
  string,
  assetRef,  // a tuple of type + id values identifying the asset to be drawn
};

struct Arg {
  Arg(double v) : type(number), numberValue(v) {}
  Arg(const std::string& s) : type(string), stringValue(s) {}
  Arg(const std::pair<std::string, std::string>& pair) : type(assetRef), assetRefValue(pair) {}

  ArgType type = number;
  double numberValue = 0.0;
  std::string stringValue;
  std::optional<std::pair<std::string, std::string>> assetRefValue;
};

struct Command {
  Command() {}

  OpType op = noop;
  std::vector<Arg> args;
};

using CommandList = std::vector<Command>;

struct VCSCanvasDisplayList {
  CommandList cmds;
  int width;
  int height;
};

// throws on parse error
std::unique_ptr<VCSCanvasDisplayList> ParseVCSDisplayListJSON(std::string str);

} // namespace canvex
