#include "canvas_display_list.h"
#include <iostream>
#include <sstream>
#include <unordered_map>
#include "rapidjson/reader.h"

namespace canvex {

using namespace rapidjson;
using namespace std;


class DisplayListJSONHandler {
 public:
  DisplayListJSONHandler(VCSCanvasDisplayList& dl) : dl_(dl) {};

  // -- RapidJSON handler interface --
  bool StartObject() {
    switch (parseState_) {
      default: break;
      case start:
        parseState_ = top;
        return true;
      case cmdArgArray:
        parseState_ = cmdArgObj;

        // start reading values into this object
        cmdArgObjAssetRef_ = {};
        return true;
    }
    return throwErr("Unexpected object value");
  }

  bool Key(const char* cstr, SizeType /*length*/, bool /*copy*/) {
    std::string s = cstr;
    switch (parseState_) {
      default: break;
      case top:
        if (s == "width" || s == "height") {
          topKey_ = s;
          return true;
        }
        if (s == "commands") {
          parseState_ = expectingCommandsArray;
          return true;
        }
        break;
      case cmdArgObj:
        //cout << "cmd arg obj key " << s << endl;
        cmdArgObjKey_ = s;
        return true;
    }
    std::stringstream ss;
    ss << "Unexpected key: " << s;
    return throwErr(ss.str());
  }

  bool EndObject(SizeType /*memberCount*/) {
    switch (parseState_) {
      default: break;
      case top:
        parseState_ = end;
        return true;
      case cmdArgObj:
        //cout << "finished arg obj: " << cmdArgObjAssetRef_.first << ", " << cmdArgObjAssetRef_.second << endl;
        addArgToCurrentCmd(cmdArgObjAssetRef_);

        cmdArgObjAssetRef_ = {};
        parseState_ = cmdArgArray;
        return true;
    }
    return throwErr("Unexpected endObject");
  }

  bool StartArray() {
    switch (parseState_) {
      default: break;
      case expectingCommandsArray:
        //cout << "Starting commands array" << endl;
        parseState_ = commandsArray;
        return true;
      case commandsArray:
        dl_.cmds.emplace_back();
        //cout << "Starting cmd, count now " << dl_.cmds.size() << endl;
        parseState_ = cmdArray;
        return true;
      case cmdArray:
        if (!currentCmdIsValid()) {
          throwErr("Unexpected array value within cmd (op needs to be set first)");
        }
        parseState_ = cmdArgArray;
        //cout << "Entering cmd args array" << endl;
        return true;
    }
    return throwErr("Unexpected array value");
  }
  bool EndArray(SizeType /*elementCount*/) {
    switch (parseState_) {
      default: break;
      case commandsArray:
        parseState_ = top;
        return true;
      case cmdArray:
        parseState_ = commandsArray;
        return true;
      case cmdArgArray:
        parseState_ = cmdArray;
        return true;
    }
    return throwErr("Unexpected end of array");
  }

  bool String(const char* cstr, SizeType /*length*/, bool /*copy*/) { 
    std::string s = cstr;
    switch (parseState_) {
      default: break;
      case cmdArray:
        if (currentCmdIsValid()) {
          // we already have the op (first item), so this is an argument
          addArgToCurrentCmd(s);
          return true;
        }
        else if (!setOpInCurrentCmd(s)) {
          std::stringstream ss;
          ss << "Unrecognized op value for command: " << s;
          throwErr(ss.str());
        }
        return true;
      case cmdArgArray:
        addArgToCurrentCmd(s);
        return true;

      case cmdArgObj:
        if (cmdArgObjKey_ == "type") {
          cmdArgObjAssetRef_.first = s;
        } else if (cmdArgObjKey_ == "id") {
          cmdArgObjAssetRef_.second = s;
        }
        return true;
    }
    std::stringstream ss;
    ss << "Unexpected string value: " << s;
    return throwErr(ss.str());
  }

  bool Double(double d) {
    switch (parseState_) {
      default: break;
      case cmdArgArray:
        addArgToCurrentCmd(d);
        return true;        
    }
    std::stringstream ss;
    ss << "Unexpected double value: " << d;
    return throwErr(ss.str());
  }

  bool Uint(unsigned u) {
    if (u > INT_MAX) {
      return throwErr("Unexpected uint value, is larger than INT_MAX");
    }
    return Int(u);
  }

  bool Int(int i) {
    switch (parseState_) {
      default: break;
      case top:
        if (topKey_ == "width") {
          //cout << "Got width: " << i << endl;
          dl_.width = i;
          return true;
        }
        if (topKey_ == "height") {
          //cout << "Got height: " << i << endl;
          dl_.height = i;
          return true;
        }
        break;

      case cmdArgArray:
        addArgToCurrentCmd(i);
        return true;
        
    }
    std::stringstream ss;
    ss << "Unexpected int value: " << i;
    return throwErr(ss.str());
  }

  // -- currently not handled, not expected in data --
  bool Null() {
    return throwErr("Unexpected null value");
  }
  bool Bool(bool /*b*/) {
    return throwErr("Unexpected bool value");
  }
  bool RawNumber(const char* /*cstr*/, SizeType /*length*/, bool /*copy*/) { 
    return throwErr("Unexpected rawNumber value");
  }
  bool Int64(int64_t /*i*/) {
    return throwErr("Unexpected int64 value");
  }
  bool Uint64(uint64_t /*u*/) {
    return throwErr("Unexpected uint64 value");
  }

 private:
  VCSCanvasDisplayList& dl_;

  enum parseState {
    start = 0,
    top,
    expectingCommandsArray,
    commandsArray,
    cmdArray,
    cmdArgArray,
    cmdArgObj,
    end,
  };

  parseState parseState_ = start;
  std::string topKey_;
  std::string cmdArgObjKey_;
  std::pair<std::string, std::string> cmdArgObjAssetRef_;

  bool currentCmdIsValid() {
    if (dl_.cmds.size() < 1) return false;
    if (dl_.cmds.back().op == noop) return false;
    return true;
  }

  bool addArgToCurrentCmd(double arg) {
    dl_.cmds.back().args.emplace_back(arg);
    //cout << "Added arg " << arg << ", len now " << dl_.cmds.back().args.size() << endl;
    return true;
  }

  bool addArgToCurrentCmd(const std::string& arg) {
    dl_.cmds.back().args.emplace_back(arg);
    //cout << "Added arg " << arg << ", len now " << dl_.cmds.back().args.size() << endl;
    return true;
  }

  bool addArgToCurrentCmd(const std::pair<std::string, std::string>& arg) {
    dl_.cmds.back().args.emplace_back(arg);
    //cout << "Added pair arg, len now " << dl_.cmds.back().args.size() << endl;
    return true;
  }

  const std::unordered_map<std::string, OpType> opsByName_ = {
    {"save", OpType::save},
    {"restore", OpType::restore},
    {"fillStyle", OpType::fillStyle},
    {"font", OpType::font},
    {"clip", OpType::clip},
    {"fillRect", OpType::fillRect},
    {"fillText", OpType::fillText},
    {"drawImage", OpType::drawImage},
    {"beginPath", OpType::beginPath},
    {"closePath", OpType::closePath},
    {"ellipse", OpType::ellipse},
    {"moveTo", OpType::moveTo},
    {"lineTo", OpType::lineTo},
    {"quadraticCurveTo", OpType::quadraticCurveTo},
  };

  bool setOpInCurrentCmd(std::string& s) {
    auto search = opsByName_.find(s);
    if (search == opsByName_.end()) {
      return false;
    }
    dl_.cmds.back().op = search->second;
    return true;
  }

  bool throwErr(std::string msg) {
    std::stringstream ss;
    ss << "JSON display list parse error: ";
    ss << msg;
    ss << " (parseState=" << parseState_ << ")";
    throw std::runtime_error(ss.str());
    return false;
  }
};


std::unique_ptr<VCSCanvasDisplayList> ParseVCSDisplayListJSON(std::string jsonStr)
{
  auto dl = std::make_unique<VCSCanvasDisplayList>();

  rapidjson::Reader reader;
  rapidjson::StringStream ss(jsonStr.c_str());
  DisplayListJSONHandler jsonHandler(*dl);

  reader.Parse(ss, jsonHandler);

  return dl;
}

} // namespace canvex
