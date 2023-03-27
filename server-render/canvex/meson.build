project('canvex', ['c', 'cpp', 'rust'],
  version : '0.1',
  default_options : ['warning_level=3', 'c_std=c99', 'cpp_std=gnu++17', 'optimization=3', 'debug=false'])

subdir('src')

cpp = meson.get_compiler('cpp')
c = meson.get_compiler('c')

zlib_dep = dependency('zlib')
png_dep = dependency('libpng')
freetype_dep = dependency('freetype2')

system_mac = build_machine.system() == 'darwin'
build_cpu = build_machine.cpu()



if system_mac
  if build_cpu == 'x86_64'
    message('Building for macOS X86')
    skia_libdir = meson.current_source_dir() + '/canvex-skia/lib-static/mac-x64'
  else
    message('Building for macOS ARM')
    skia_libdir = meson.current_source_dir() + '/canvex-skia/lib-static/mac-arm64'
  endif
else
  if build_cpu == 'x86_64'
    message('Building for Linux x86_64')
    skia_libdir = meson.current_source_dir() + '/canvex-skia/lib-static/linux-x64'
  else
    message('Building for Linux ARM')
    skia_libdir = meson.current_source_dir() + '/canvex-skia/lib-static/linux-arm64'
  endif
endif
message('Using Skia libdir: {}', skia_libdir)


skia_lib = cpp.find_library('skia', static : true, dirs : skia_libdir)
skia_include = include_directories('./canvex-skia')

if system_mac
  r = run_command('brew', '--prefix', check: false)
  brew_prefix = r.stdout().strip()
  errortxt = r.stderr().strip()

  # macOS system dependencies
  mac_frameworks = declare_dependency(
    dependencies : [
      dependency('CoreFoundation'),
      dependency('CoreGraphics'),
      dependency('CoreText'),
    ]
  )
  jpeg_lib_dir = brew_prefix + '/opt/jpeg-turbo/lib'
  webp_lib_dir = brew_prefix + '/opt/webp/lib/'
  jpeg_include_dir = brew_prefix + '/opt/jpeg-turbo/include'
  
  libjpeg_turbo = cpp.find_library('jpeg', dirs : jpeg_lib_dir)
  libwebp_turbo = cpp.find_library('webp', dirs : webp_lib_dir)
  mac_homebrew_deps = declare_dependency(
    dependencies : [
      zlib_dep,
      png_dep,
      libjpeg_turbo,
      libwebp_turbo,
    ],
    include_directories : jpeg_include_dir,
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

  skia_system_deps = declare_dependency(
    dependencies : [
      zlib_dep,
      freetype_dep,
      threads_dep,
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
