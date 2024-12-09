#include "parse_inputtimings.h"
#include <iostream>
#include <sstream>
#include <unordered_map>
#include "rapidjson/reader.h"

namespace vcsrender {

using namespace rapidjson;
using namespace std;

/*
      "frame": 72,
      "videoInputId": 1001,
      "durationInFrames": 72,
      "clipId": "s1",
      "seqDir": "/Users/pauli/Documents/daily/ffmpeg-scripts/cut-tmp/s1"
*/

class InputTimingsJSONHandler {
 public:
  InputTimingsJSONHandler(VCSVideoInputTimingsDesc& desc) : desc_(desc) {};

  // -- RapidJSON handler interface --
  bool StartObject() {
    switch (parseState_) {
      default: break;
      case start:
        parseState_ = top;
        return true;

      case eventsArray:
        parseState_ = eventObj;
        desc_.playbackEvents.emplace_back();
        return true;
    }
    return throwErr("Unexpected object value");
  }

  bool Key(const char* cstr, SizeType /*length*/, bool /*copy*/) {
    std::string s = cstr;
    switch (parseState_) {
      default: break;

      case top:
        if (s == "durationInFrames" || s == "startFrame") {
          currKey_ = s;
          return true;
        }
        if (s == "playbackEvents") {
          parseState_ = expectingEventsArray;
          return true;
        }
        break;

      case eventObj:
        if (s == "frame" || s == "videoInputId" || s == "durationInFrames"
          || s == "seqDir" || s == "clipId" || s == "w" || s == "h") {
          currKey_ = s;
          return true;
        }
        break;
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
      case eventObj:
        parseState_ = eventsArray;
        return true;
    }
    return throwErr("Unexpected endObject");
  }

  bool StartArray() {
    switch (parseState_) {
      default: break;
      case expectingEventsArray:
        //cout << "Starting layers array" << endl;
        parseState_ = eventsArray;
        return true;
    }
    return throwErr("Unexpected array value");
  }
  bool EndArray(SizeType /*elementCount*/) {
    switch (parseState_) {
      default: break;
      case eventsArray:
        parseState_ = top;
        return true;
    }
    return throwErr("Unexpected end of array");
  }

  bool String(const char* cstr, SizeType /*length*/, bool /*copy*/) { 
    std::string s = cstr;
    switch (parseState_) {
      default: break;
      case eventObj:
        if (currKey_ == "seqDir") {
          currentEvent().seqDir = s;
          return true;
        } else if (currKey_ == "clipId") {
          // ignore this value, we don't use it in rendering
          return true;
        }
        break;
    }
    std::stringstream ss;
    ss << "Unexpected string value: " << s;
    return throwErr(ss.str());
  }

  bool Int(int i) {
    if (i < 0) {
      return throwErr("Unexpected int value, is negative");
    }
    return Uint(i);
  }

  bool Uint(unsigned u) {
    switch (parseState_) {
      default: break;
      case eventObj:
        if (currKey_ == "videoInputId") {
          currentEvent().videoInputId = u;
          return true;
        } else if (currKey_ == "frame") {
          currentEvent().frameIndex = u;
          return true;
        } else if (currKey_ == "durationInFrames") {
          currentEvent().durationInFrames = u;
          return true;
        } else if (currKey_ == "w") {
          currentEvent().w = u;
          return true;
        } else if (currKey_ == "h") {
          currentEvent().h = u;
          return true;
        }
        break;
      case top:
        if (currKey_ == "durationInFrames") {
          desc_.durationInFrames = u;
          return true;
        } else if (currKey_ == "startFrame") {
          desc_.startFrame = u;
          return true;
        }
    }
    std::stringstream ss;
    ss << "Unexpected uint value: " << u << ", currKey = " << currKey_;
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
  bool Double(double /*d*/) {
    return throwErr("Unexpected double value");
  }

 private:
  VCSVideoInputTimingsDesc& desc_;

  enum parseState {
    start = 0,
    top,
    expectingEventsArray,
    eventsArray,
    eventObj,
    end,
  };

  parseState parseState_ = start;
  std::string currKey_;

  VideoInputPlaybackEvent& currentEvent() {
    if (desc_.playbackEvents.size() < 1) {
      throwErr("Event array is empty when parser tries to write");
    }
    return desc_.playbackEvents.back();
  }

  bool throwErr(std::string msg) {
    std::stringstream ss;
    ss << "JSON input timings parse error: ";
    ss << msg;
    ss << " (parseState=" << parseState_ << ")";
    throw std::runtime_error(ss.str());
    return false;
  }
};



std::unique_ptr<VCSVideoInputTimingsDesc> ParseVCSVideoInputTimingsDescJSON(const std::string& str) {
  return ParseVCSVideoInputTimingsDescJSON(str.c_str());
}

std::unique_ptr<VCSVideoInputTimingsDesc> ParseVCSVideoInputTimingsDescJSON(const char* jsonStr) {
  auto desc = std::make_unique<VCSVideoInputTimingsDesc>();

  rapidjson::Reader reader;
  rapidjson::StringStream ss(jsonStr);
  InputTimingsJSONHandler jsonHandler(*desc);

  auto result = reader.Parse(ss, jsonHandler);
  if (!result) {
    std::stringstream ss;
    ss << "Input timings can't be parsed, probably not valid JSON (error code ";
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

  std::cout << "Read input timings json with " << desc->playbackEvents.size() << " events"
      << ", duration = " << desc->durationInFrames
      << ", startFrame = " << desc->startFrame
      << std::endl;

  return desc;
}

} // namespace vcsrender