project('canvex', 'cpp',
  version : '0.1',
  default_options : ['warning_level=3', 'cpp_std=gnu++17'])

cpp = meson.get_compiler('cpp')

skia_libdir = meson.current_source_dir() + '/skia/lib-static/mac-arm64'
message('Using Skia libdir: {}', skia_libdir)

skia_lib = cpp.find_library('skia', static : true, dirs : skia_libdir)
#skia_icu = cpp.find_library('icu', static : true, dirs : skia_libdir)
#skia_sktext = cpp.find_library('sktext', static : true, dirs : skia_libdir)
#skia_skunicode = cpp.find_library('skunicode', static : true, dirs : skia_libdir)

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
    dependency('png'),
    libjpeg_turbo,
  ],
  include_directories : '/opt/homebrew/opt/jpeg-turbo/include',
)

skia_dep = declare_dependency(
  dependencies : [
    skia_lib,
    #skia_icu,
    #skia_sktext,
    #skia_skunicode,
    mac_frameworks,
    mac_homebrew_deps,
  ],
  include_directories : include_directories('./skia'),
)

rapidjson_dep = declare_dependency(
  include_directories : include_directories('./rapidjson'),
)

subdir('src')

executable(
  'canvex',
  canvex_sources,
  dependencies : [
    skia_dep,
    rapidjson_dep,
  ],
  install : true,
  cpp_args: [
    '-Wno-gnu-anonymous-struct',
    '-Wno-gnu-zero-variadic-macro-arguments',
    '-Wno-nested-anon-types',
  ],
)
