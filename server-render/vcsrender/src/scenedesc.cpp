#include "scenedesc.h"
#include <iostream>
#include <sstream>
#include <unordered_map>
#include "rapidjson/reader.h"

namespace vcsrender {

using namespace rapidjson;
using namespace std;


/*
  [ {"type":"video","id":45210,"frame":{"x":0,"y":0,"w":960,"h":1080},"attrs":{"scaleMode":"fill"}},
    {"type":"video","id":46724,"frame":{"x":960,"y":0,"w":960,"h":1080},"attrs":{"scaleMode":"fill"}} ]
*/

class VideoLayerListJSONHandler {
 public:
  VideoLayerListJSONHandler(VCSVideoLayerList& list) : list_(list) {};

  double layerScale = 1.0;

  // -- RapidJSON handler interface --
  bool StartObject() {
    switch (parseState_) {
      default: break;
      case layersArray:
        //std::cout << "Adding new layer from JSON obj" << std::endl;
        list_.emplace_back();
        parseState_ = layerObj;
        return true;

      case expectingFrameObj:
        parseState_ = frameObj;
        return true;

      case expectingAttrsObj:
        parseState_ = attrsObj;
        return true;
    }
    return throwErr("Unexpected object value");
  }

  bool Key(const char* cstr, SizeType /*length*/, bool /*copy*/) {
    std::string s = cstr;
    switch (parseState_) {
      default: break;
      case layerObj:
        if (s == "type" || s == "id") {
          currKey_ = s;
          return true;
        }
        if (s == "frame") {
          parseState_ = expectingFrameObj;
          return true;
        }
        if (s == "attrs") {
          parseState_ = expectingAttrsObj;
          return true;
        }
        break;
      case frameObj:
      case attrsObj:
        currKey_ = s;
        return true;
    }
    std::stringstream ss;
    ss << "Unexpected key: " << s;
    return throwErr(ss.str());
  }

  bool EndObject(SizeType /*memberCount*/) {
    switch (parseState_) {
      default: break;
      case layerObj:
        /*cout << "finished arg obj: " << cmdArgObjAssetRef_.first << ", " << cmdArgObjAssetRef_.second << endl;
        addArgToCurrentCmd(cmdArgObjAssetRef_);

        cmdArgObjAssetRef_ = {};
        */
        parseState_ = layersArray;
        return true;
      
      case frameObj:
      case attrsObj:
        parseState_ = layerObj;
        return true;

    }
    return throwErr("Unexpected endObject");
  }

  bool StartArray() {
    switch (parseState_) {
      default: break;
      case expectingLayersArray:
        //cout << "Starting layers array" << endl;
        parseState_ = layersArray;
        return true;
    }
    return throwErr("Unexpected array value");
  }
  bool EndArray(SizeType /*elementCount*/) {
    switch (parseState_) {
      default: break;
      case layersArray:
        parseState_ = end;
        return true;
    }
    return throwErr("Unexpected end of array");
  }

  bool String(const char* cstr, SizeType /*length*/, bool /*copy*/) { 
    std::string s = cstr;
    switch (parseState_) {
      default: break;
      case layerObj:
        if (currKey_ == "type") {
          // don't record the value for the 'type' key, we assume it's always 'video'
          return true;
        }
        break;

      case attrsObj:
        if (currKey_ == "scaleMode") {
          if (s == "fill") {
            currentLayer().attrs.scaleMode = VCSScaleMode::fill;
            return true;
          } else if (s == "fit") {
            currentLayer().attrs.scaleMode = VCSScaleMode::fit;
            return true;
          }
        }
        break;
    }
    std::stringstream ss;
    ss << "Unexpected string value: " << s;
    return throwErr(ss.str());
  }

  bool Double(double d) {
    switch (parseState_) {
      default: break;

      case frameObj:
        if (currKey_ == "x") {
          currentLayer().frame.x = d * layerScale;
          return true;
        } else if (currKey_ == "y") {
          currentLayer().frame.y = d * layerScale;
          return true;
        } else if (currKey_ == "w") {
          currentLayer().frame.w = d * layerScale;
          return true;
        } else if (currKey_ == "h") {
          currentLayer().frame.h = d * layerScale;
          return true;
        }
        break;

      case attrsObj:
        if (currKey_ == "cornerRadiusPx") {
          currentLayer().attrs.cornerRadiusPx = d * layerScale;
          return true;
        }
        break;
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

      case layerObj:
        if (currKey_ == "id") {
          currentLayer().id = i;
          return true;
        }
        break;

      case frameObj:
        if (currKey_ == "x") {
          currentLayer().frame.x = i * layerScale;
          return true;
        } else if (currKey_ == "y") {
          currentLayer().frame.y = i * layerScale;
          return true;
        } else if (currKey_ == "w") {
          currentLayer().frame.w = i * layerScale;
          return true;
        } else if (currKey_ == "h") {
          currentLayer().frame.h = i * layerScale;
          return true;
        }
        break;

      case attrsObj:
        if (currKey_ == "cornerRadiusPx") {
          currentLayer().attrs.cornerRadiusPx = i * layerScale;
          return true;
        }
        break;
    }
    std::stringstream ss;
    ss << "Unexpected int value: " << i << ", currKey = " << currKey_;
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
  VCSVideoLayerList& list_;

  enum parseState {
    expectingLayersArray = 0,
    layersArray,
    layerObj,
    expectingFrameObj,
    frameObj,
    expectingAttrsObj,
    attrsObj,
    end,
  };

  parseState parseState_ = expectingLayersArray;
  std::string currKey_;

  VideoLayerDesc& currentLayer() {
    if (list_.size() < 1) {
      throwErr("Layer array is empty when parser tries to write");
    }
    return list_.back();
  }

  bool throwErr(std::string msg) {
    std::stringstream ss;
    ss << "JSON video layer list parse error: ";
    ss << msg;
    ss << " (parseState=" << parseState_ << ")";
    throw std::runtime_error(ss.str());
    return false;
  }
};

std::unique_ptr<VCSVideoLayerList> ParseVCSVideoLayerListJSON(const std::string& jsonStr, VideoLayerParseOptions opts)
{
  return ParseVCSVideoLayerListJSON(jsonStr.c_str(), opts);
}

std::unique_ptr<VCSVideoLayerList> ParseVCSVideoLayerListJSON(const char* jsonStr, VideoLayerParseOptions opts)
{
  auto list = std::make_unique<VCSVideoLayerList>();

  rapidjson::Reader reader;
  rapidjson::StringStream ss(jsonStr);
  VideoLayerListJSONHandler jsonHandler(*list);

  jsonHandler.layerScale = opts.scale != 0.0 ? opts.scale : 1.0;

  auto result = reader.Parse(ss, jsonHandler);
  if (!result) {
    std::stringstream ss;
    ss << "Display list can't be parsed, probably not valid JSON (error code ";
    ss << result.Code();
    ss << " at offset " << result.Offset() << ")";

    if (result.Code() == kParseErrorDocumentRootNotSingular) {
      size_t len = strlen(jsonStr);
      ss << "; code = kParseErrorDocumentRootNotSingular; jsonStr len=" << len;
      if (result.Offset() < len) {
        ss << ", char code at error offset is: " << (uint32_t)(((uint8_t *)jsonStr)[result.Offset()]);
      }
    }

    throw std::runtime_error(ss.str());
  }

  return list;
}

} // namespace vcsrender

