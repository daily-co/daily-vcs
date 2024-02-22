import * as childProcess from "node:child_process";

export async function getFullMovieMetadataAsync(path) {
  // ffprobe -v quiet -show_format -show_streams -print_format json BigBuckBunny.mp4

  const args = [
    "-v",
    "quiet",
    "-show_format",
    "-show_streams",
    "-print_format",
    "json",
    path,
  ];

  const child = childProcess.spawn("ffprobe", args);
  let stdout = "";
  child.stdout.on("data", (data) => {
    stdout += data.toString();
  });
  child.stderr.on("data", (data) => {
    data = data.toString();
    console.log("** ffprobe stderr: ", data);
  });
  child.on("error", (err) => {
    throw new Error(`ffprobe child error: ${err.message}`);
  });
  const exitCode = await new Promise((resolve, _reject) => {
    child.on("close", resolve);
  });

  return JSON.parse(stdout);
}

export function findBasicVideoPropsInMovieMetadata(md) {
  if (!md?.streams || md.streams.length < 1) {
    console.error("** no streams available in movie metadata");
    return null;
  }
  let videoStream = md.streams.find((s) => s.codec_type === "video");
  if (!videoStream) {
    console.error(
      "** no video stream available in movie metadata (%d streams)",
      md.streams
    );
    return null;
  }
  const { width, height, r_frame_rate, avg_frame_rate } = videoStream;

  const fpsStr =
    r_frame_rate && r_frame_rate.length > 1 ? r_frame_rate : avg_frame_rate;
  let fps = 0;
  let idx;
  if ((idx = fpsStr.indexOf("/")) > 0) {
    let nm = parseFloat(fpsStr.substring(0, idx));
    let dn = parseFloat(fpsStr.substring(idx + 1));
    if (isFinite(nm) && isFinite(dn) && dn > 0) {
      fps = nm / dn;
    }
  }

  return { w: width, h: height, fps };
}
