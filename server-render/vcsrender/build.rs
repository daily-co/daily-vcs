extern crate bindgen;
extern crate cc;

use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    // Link with platform-specific dependencies:
    //   * C++ stdlib
    //   * our custom Skia bild
    //   * its dependencies like libpng
    let target = env::consts::OS;
    let processor_arch = env::consts::ARCH;

    // The bindgen::Builder is the main entry point
    // to bindgen, and lets you build up options for
    // the resulting bindings.
    let bindings = bindgen::Builder::default()
        // The input header we would like to generate
        // bindings for.
        .header("include/vcsrender_c_api.h")
        // Only generate the bindings we need
        .allowlist_function("^Vcs.*")
        .allowlist_type("^Vcs.*")
        .allowlist_type("^VCS*")
        // Tell cargo to invalidate the built crate whenever any of the
        // included header files changed.
        .parse_callbacks(Box::new(bindgen::CargoCallbacks))
        // Finish the builder and generate the bindings.
        .generate()
        // Unwrap the Result and panic on failure.
        .expect("Unable to generate bindings");

    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("vcsrender_bindings.rs"))
        .expect("Couldn't write bindings!");

    cc::Build::new()
        .cpp(true)
        .include("subprojects/canvex")
        .include("subprojects/canvex/include")
        .include("subprojects/canvex/canvex-skia")
        .include("libyuv/include")
        .flag("-std=c++17")
        .file("subprojects/canvex/src/canvas_display_list.cpp")
        .file("subprojects/canvex/src/file_util.cpp")
        .file("subprojects/canvex/src/style_util.cpp")
        .file("subprojects/canvex/src/canvex_skia_context.cpp")
        .file("subprojects/canvex/src/canvex_skia_executor.cpp")
        .file("subprojects/canvex/src/canvex_skia_resource_context.cpp")
        .file("subprojects/canvex/src/canvex_c_api.cpp")
        .file("src/vcsrender_c_api.cpp")
        .file("src/parse/parse_scenedesc.cpp")
        .file("src/yuv_compositor.cpp")
        .file("src/thumbs.cpp")
        .file("src/mask.cpp")
        .compile("vcsrender");

    if target.contains("macos") {
        let brew_prefix = get_brew_prefix();
        println!("cargo:rustc-link-lib=dylib=c++");
        println!("cargo:rustc-link-lib=framework=CoreFoundation");
        println!("cargo:rustc-link-lib=framework=CoreGraphics");
        println!("cargo:rustc-link-lib=framework=CoreText");

        if processor_arch.contains("x86_64") {
            println!(
                "cargo:rustc-link-search=native=subprojects/canvex/canvex-skia/lib-static/mac-x64"
            );
            println!("cargo:rustc-link-search=native=libyuv/lib-static/mac-x64");
        } else {
            println!("cargo:rustc-link-search=native=subprojects/canvex/canvex-skia/lib-static/mac-arm64");
            println!("cargo:rustc-link-search=native=libyuv/lib-static/mac-arm64");
            println!("cargo:rustc-link-lib=static=yuv_neon");
        }

        println!("cargo:rustc-link-lib=static=skia");
        println!("cargo:rustc-link-lib=static=yuv_internal");

        println!(
            "cargo:rustc-link-search=native={}{}",
            brew_prefix, "/opt/jpeg-turbo/lib"
        );
        println!("cargo:rustc-link-lib=jpeg");

        println!("cargo:rustc-link-search=native={}{}", brew_prefix, "/lib");
        println!("cargo:rustc-link-lib=png");
        println!("cargo:rustc-link-lib=z");
    } else if target.contains("linux") {
        if processor_arch.contains("x86_64") {
            println!("cargo:rustc-link-search=native=subprojects/canvex/canvex-skia/lib-static/linux-x64");
            println!("cargo:rustc-link-search=native=libyuv/lib-static/linux-x64");
        } else {
            println!("cargo:rustc-link-search=native=subprojects/canvex/canvex-skia/lib-static/linux-arm64");
            println!("cargo:rustc-link-search=native=libyuv/lib-static/linux-arm64");
        }
        println!("cargo:rustc-link-lib=static=skia");
        println!("cargo:rustc-link-lib=static=yuv_internal");
        println!("cargo:rustc-link-lib=dylib=freetype");
    } else {
        unimplemented!();
    }
}

fn get_brew_prefix() -> String {
    let output = Command::new("brew")
        .arg("--prefix")
        .output()
        .expect("failed to execute brew --prefix");

    let mut path = String::from_utf8_lossy(&output.stdout).into_owned();
    if path.ends_with('\n') {
        path.truncate(path.len() - 1);
    }
    return path;
}
