import * as fs from "node:fs";
import * as Path from "node:path";
import * as childProcess from "node:child_process";

// this could be configurable
const g_stderrTempFilePrefix = "cut_ffmpegout_";

export async function runFfmpegCommandAsync(contextId, args) {
  if (!Array.isArray(args)) {
    throw new Error("Invalid args for ffmpeg");
  }
  if (!args.includes("-y")) {
    // answer yes to any interactive questions
    args = ["-y"].concat(args);
  }

  console.log("cmd:  ffmpeg", args.join(" "));

  const stderrOutPath = Path.resolve(
    "/tmp",
    `${g_stderrTempFilePrefix}${contextId}.txt`
  );
  try {
    fs.rmSync(stderrOutPath);
  } catch (e) {}

  const child = childProcess.spawn("ffmpeg", args, {
    // ffmpeg writes log output to stderr but it lets the output buffer fill up,
    // so the default of a pipe doesn't work. it will hang our process.
    // write the output to a tmp file instead
    stdio: ["pipe", "pipe", fs.openSync(stderrOutPath, "w")],
  });
  child.on("error", (err) => {
    throw new Error(`ffmpeg child error: ${err.message}`);
  });
  const exitCode = await new Promise((resolve, _reject) => {
    child.on("close", resolve);
  });
  if (exitCode) {
    throw new Error(
      `ffmpeg subprocess exited with ${exitCode}, log at: ${stderrOutPath}`
    );
  }

  return true;
}
