#pragma once
#include <chrono>

static inline double getMonotonicTime() noexcept {
    auto now = std::chrono::steady_clock::now();
    int64_t now_usec = std::chrono::time_point_cast<std::chrono::microseconds>(now)
                            .time_since_epoch().count();
    return now_usec / 1.0e6;
}
