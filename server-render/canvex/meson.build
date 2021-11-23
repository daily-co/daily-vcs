project('canvex', ['c', 'cpp', 'rust'],
  version : '0.1',
  default_options : ['warning_level=3', 'c_std=c99', 'cpp_std=gnu++17', 'optimization=3', 'debug=false'])

subdir('src')

cpp = meson.get_compiler('cpp')
c = meson.get_compiler('c')

png_dep = dependency('libpng')
freetype_dep = dependency('freetype2')

system_mac = build_machine.system() == 'darwin'

if system_mac
  # currently only ARM Mac build available of the Skia libs
  message('Building for macOS ARM')
  skia_libdir = meson.current_source_dir() + '/canvex-skia/lib-static/mac-arm64'
else
  message('Building for Linux x86_64')
  skia_libdir = meson.current_source_dir() + '/canvex-skia/lib-static/linux-x64'
endif

message('Using Skia libdir: {}', skia_libdir)

skia_lib = cpp.find_library('skia', static : true, dirs : skia_libdir)
skia_include = include_directories('./canvex-skia')

if system_mac
  # macOS system dependencies
  mac_frameworks = declare_dependency(
    dependencies : [
      dependency('CoreFoundation'),
      dependency('CoreGraphics'),
      dependency('CoreText'),
    ]
  )

  libjpeg_turbo = cpp.find_library('jpeg', dirs : '/opt/homebrew/opt/jpeg-turbo/lib')
  mac_homebrew_deps = declare_dependency(
    dependencies : [
      png_dep,
      libjpeg_turbo,
    ],
    include_directories : '/opt/homebrew/opt/jpeg-turbo/include',
  )

  skia_system_deps = declare_dependency(
    dependencies : [
      mac_frameworks,
      mac_homebrew_deps,
    ],
  )
else
  # Linux dependencies
  threads_dep = dependency('threads')
  zlib_dep = dependency('zlib')

  skia_system_deps = declare_dependency(
    dependencies : [
      threads_dep,
      zlib_dep,
      freetype_dep
    ],
  )
endif

skia_dep = declare_dependency(
  dependencies : [
    skia_lib,
    skia_system_deps,
  ],
  include_directories : skia_include,
)

rapidjson_dep = declare_dependency(
  include_directories : include_directories('./rapidjson'),
)

canvex_cpp_args = [
  # somehow this project stubbornly builds in c++17 instead of gnu++17 on Mac,
  # despite my best configuration efforts. ignore warnings about Skia's use of gnu features.
  '-Wno-gnu-anonymous-struct',
  '-Wno-gnu-zero-variadic-macro-arguments',
  '-Wno-nested-anon-types',
]

canvex_lib = static_library(
  'canvex',
  canvex_lib_sources,
  dependencies : [
    skia_dep,
    rapidjson_dep,
  ],
  cpp_args: canvex_cpp_args,
)

executable(
  'canvex_demo',
  canvex_standalone_demo_sources,
  link_with : canvex_lib,
  dependencies : [
    skia_dep,
  ],
  install : true,
  cpp_args: canvex_cpp_args,
)

executable(
  'canvex_render_frame',
  canvex_render_frame_util_sources,
  link_with : canvex_lib,
  dependencies : [
    png_dep
  ],
  install : true,
)
