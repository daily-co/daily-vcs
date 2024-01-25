project('vcsrender', ['c', 'cpp'],
  version : '0.1',
  default_options : ['warning_level=3', 'c_std=c99', 'cpp_std=gnu++17', 'optimization=3', 'debug=true'])

subdir('src')

cpp = meson.get_compiler('cpp')
c = meson.get_compiler('c')

#zlib_dep = dependency('zlib')
#png_dep = dependency('libpng')
#freetype_dep = dependency('freetype2')

system_mac = build_machine.system() == 'darwin'
build_cpu = build_machine.cpu()

if system_mac
  if build_cpu == 'x86_64'
    message('Building for macOS X86')
    libyuv_libdir = meson.current_source_dir() + '/libyuv/lib-static/mac-x64'
  else
    message('Building for macOS ARM')
    libyuv_libdir = meson.current_source_dir() + '/libyuv/lib-static/mac-arm64'

    libyuv_lib = cpp.find_library('yuv_internal', static : true, dirs : libyuv_libdir)
    libyuv_neon_lib = cpp.find_library('yuv_neon', static : true, dirs : libyuv_libdir)
    libyuv_libs = [
      libyuv_lib,
      libyuv_neon_lib
    ]
  endif
  message('Using libyuv libdir: {}', libyuv_libdir)
else
  message('Building for Linux x86_64')
  libyuv_libdir = meson.current_source_dir() + '/libyuv/lib-static/linux-x64'
  
  libyuv_lib = cpp.find_library('yuv_internal', static : true, dirs : libyuv_libdir)
  libyuv_libs = [
    libyuv_lib
  ]
endif

libyuv_include = include_directories('./libyuv/include')

platform_deps = []

if system_mac
  r = run_command('brew', '--prefix', check: false)
  brew_prefix = r.stdout().strip()
  errortxt = r.stderr().strip()

  brew_include_dir = brew_prefix + '/include'  
  brew_lib_dir = brew_prefix + '/lib'
  argp = cpp.find_library('argp', dirs : brew_lib_dir)

  mac_homebrew_deps = declare_dependency(
    dependencies : [
      argp,
    ],
    include_directories : brew_include_dir,
  )

  platform_deps += mac_homebrew_deps
else
  # Linux dependencies
  #threads_dep = dependency('threads')
endif

#rapidjson_dep = declare_dependency(
#  include_directories : include_directories('./rapidjson'),
#)

libyuv_dep = declare_dependency(
  dependencies : libyuv_libs,
  include_directories : libyuv_include,
)

rapidjson_dep = declare_dependency(
  include_directories : include_directories('./subprojects/canvex'),
)

canvex_proj = subproject('canvex')
canvexlib_dep = canvex_proj.get_variable('canvexlib_dep')

execdeps = [
    canvexlib_dep,
    libyuv_dep,
    rapidjson_dep,
  ] + platform_deps

executable(
  'vcsrender_demo',
  vcsrender_demo_sources,
  dependencies : execdeps,
  install : true,
)

executable(
  'vcsrender',
  vcsrender_cli_sources,
  dependencies : execdeps,
  install : true,
)
