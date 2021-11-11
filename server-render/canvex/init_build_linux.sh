# Init the build on Linux.
# You only need to run this once, unless global build settings in meson.build are changed.
#
# To do a regular build, just run:
#   ninja -C build
# (Also available in VS Code tasks.)

meson build --native-file meson_linux.ini
ninja -C build
