#pragma once
#include <string>

// Read text file in one operation using 'stat' for file size.
// Throws on error.
std::string readTextFile(const std::string& path);
