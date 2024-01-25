#include "file_util.h"
#include <iostream>
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>

std::string readTextFile(const std::string& path) {
    struct stat sb{};
    std::string str;

    FILE* f = fopen(path.c_str(), "r");
    if (!f) {
      throw std::runtime_error("Unable to open file");
    }

    stat(path.c_str(), &sb);
    str.resize(sb.st_size);

    const size_t readResult = fread(const_cast<char*>(str.data()), sb.st_size, 1, f);
    fclose(f);

    if (readResult != 1) {
      throw std::runtime_error("Could not read all data from file");
    }

    return str;
}
