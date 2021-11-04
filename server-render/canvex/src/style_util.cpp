#include "style_util.h"
#include <cmath>
#include <cstring>

bool getRGBAColorFromCSSStyleString(const std::string& str, float* outColor) {
  if (!outColor) {
    return false;
  }

  const size_t len = str.length();
  if (len < 1) {
    return false;
  }

  double r = 0, g = 0, b = 0, a = 1;

  const char* cstr = str.c_str();
  bool isRGBA;

  if (cstr[0] == '#') {
    // parse as hex.
    // this code path may cause lint messages about C arrays.
    // they're ok since we're using known lengths and C API functions.
    if (len == 4) {
      char hexC[2] = "0";
      memcpy(hexC, cstr + 1, 1);
      r = (double)strtol(hexC, nullptr, 16) / 15.0;
      memcpy(hexC, cstr + 2, 1);
      g = (double)strtol(hexC, nullptr, 16) / 15.0;
      memcpy(hexC, cstr + 3, 1);
      b = (double)strtol(hexC, nullptr, 16) / 15.0;
    } else if (len >= 7) {
      char hexC[3] = "00";
      memcpy(hexC, cstr + 1, 2);
      r = (double)strtol(hexC, nullptr, 16) / 255.0;
      memcpy(hexC, cstr + 3, 2);
      g = (double)strtol(hexC, nullptr, 16) / 255.0;
      memcpy(hexC, cstr + 5, 2);
      b = (double)strtol(hexC, nullptr, 16) / 255.0;
    } else {
      // invalid hex format
      return false;
    }
  } else if ((isRGBA = (str.find("rgba(", 0) == 0)) || (str.find("rgb(", 0) == 0)) {
    const int kMaxAccLen = 7;
    char acc[8];
    int accLen = 0;
    const char* v;
    const char* vend = cstr + len - 1;
    int compIdx = 0;
    for (v = cstr + (isRGBA ? 5 : 4);
         v <= vend && compIdx < (isRGBA ? 4 : 3);
         v++) {
      if (v == vend || *v == ',') {
        // finish component string and convert to double
        if (accLen > 0) {
          acc[accLen] = 0;
          double f = strtod(acc, nullptr);
          switch (compIdx) {
            case 0: r = f / 255.0; break;
            case 1: g = f / 255.0; break;
            case 2: b = f / 255.0; break;
            case 3: a = f; break;
          }
        }
        accLen = 0;
        compIdx++;
      } else if ((*v >= '0' && *v <= '9') || *v == '.') {
        // collect number value into string 'acc'
        if (accLen < kMaxAccLen) {
          acc[accLen++] = *v;
        }
      }
    }
  } else {
    return false;
  }

  outColor[0] = r;
  outColor[1] = g;
  outColor[2] = b;
  outColor[3] = a;
  return true;
}
