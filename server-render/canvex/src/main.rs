#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
include!(concat!(env!("OUT_DIR"), "/canvex_bindings.rs"));

use std::env;
use std::ffi;
use std::fs;
use std::ptr;


fn main() {
  let args: Vec<String> = env::args().collect();
  let json_file = &args[1];

  let json = match fs::read_to_string(json_file) {
    Ok(json) => json,
    Err(err) => panic!("Couldn't read JSON: {}", err)
  };
  let json_cstr = match ffi::CString::new(json) {
    Ok(cstr) => cstr,
    Err(err) => panic!("CString conversion failed: {}", err)
  };

  let w: usize = 1280;
  let h: usize = 720;
  let rowBytes: usize = w * 4;
  let mut img_data: Vec<u8> = vec![0; rowBytes * h];

  let renderRes: CanvexRenderResult;

  unsafe {
    // argument is path to resource dir; defaults to ./res
    let canvexResCtx = CanvexResourceCtxCreate(ptr::null());

    renderRes = CanvexRenderJSON_RGBA(
                      canvexResCtx,
                      json_cstr.as_ptr(),
                      img_data.as_mut_ptr(), w as u32, h as u32, rowBytes as u32);

    CanvexResourceCtxDestroy(canvexResCtx);  
  }

  if renderRes != CanvexRenderResult_CanvexRenderSuccess {
    panic!("Render failed with {}", renderRes);
  }

  print!("Canvex render call successful.\n");

  // peek at color near the bottom of the buffer.
  // the "basic-lowerthird" composition renders a transparent blue here,
  // so check for that.
  let y = 600;
  let r = img_data[y * rowBytes + 0];
  let g = img_data[y * rowBytes + 1];
  let b = img_data[y * rowBytes + 2];
  let a = img_data[y * rowBytes + 3];
  print!("RGBA value at (0, 600): {} {} {} {}\n", r, g, b, a);
  if r == 34 && g == 48 && b == 178 && a == 178 {
    print!("Found expected color for 'basic-lowerthird.json'\n")
  }
}
