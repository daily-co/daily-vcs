import * as fs from 'node:fs';
import * as Path from 'node:path';
import * as childProcess from 'node:child_process';
import { pipeline } from 'node:stream/promises';

import { runFfmpegCommandAsync } from './ffexec.js';

export async function createMovieFromYuvSeqsAsync(
  dst,
  dstW,
  dstH,
  dstFps,
  renderedClips
) {
  /*
    cat "$indir"/*.yuv | ffmpeg -f rawvideo -s "$isize" -r "$fps" -pix_fmt yuv420p -i - -c:v libx264 "$outfile"
  */

  // create movie output
  const args = [
    '-y', // answer yes to any interactive questions
    '-f',
    'rawvideo',
    '-s',
    `${dstW}x${dstH}`,
    '-r',
    '' + dstFps,
    '-pix_fmt',
    'yuv420p',
    '-i',
    '-', // read input from stdout
    '-c:v',
    'libx264', // write H.264 video
    dst,
  ];

  console.log('movie create cmd:  ffmpeg', args.join(' '));

  const stderrOutPath = Path.resolve('/tmp', 'cut_moviecreate_ffmpegout.txt');
  try {
    fs.rmSync(stderrOutPath);
  } catch (e) {}

  const child = childProcess.spawn('ffmpeg', args, {
    // ffmpeg writes log output to stderr but it lets the output buffer fill up,
    // so the default of a pipe doesn't work. it will hang our process.
    // write the output to a tmp file instead
    stdio: ['pipe', 'pipe', fs.openSync(stderrOutPath, 'w')],
  });

  // write all source YUV files to movie
  for (const rclip of renderedClips) {
    const { seqDir } = rclip;
    console.log('piping files from %s...', seqDir);

    for (const fileItem of fs.readdirSync(seqDir)) {
      const path = Path.resolve(seqDir, fileItem);
      try {
        await pipeline(fs.createReadStream(path), child.stdin, { end: false });
      } catch (e) {
        console.error('** movie create frame pipeline failed: ', e);
        process.exit(3);
      }
    }
  }

  // finish movie output
  child.stdin.end();

  console.log('movie done at %s', dst);
}

export async function createAudioFromCutAsync(
  dst,
  audioSeq,
  renderedClips,
  tempDir
) {
  if (!Array.isArray(audioSeq)) {
    console.error("** Can't write audio, input type: %s", typeof audioSeq);
    return;
  }

  let ffmpegConcatFile = '';

  const tempFilePaths = [];

  for (const [itemIndex, seqItem] of audioSeq.entries()) {
    let { clips, duration } = seqItem;
    if (!Array.isArray(clips)) {
      console.warn("** Incorrect 'clips' for audio item: ", typeof clips);
      continue;
    }
    if (clips.length < 1) continue;

    let clipAudioPath;

    if (clips.length > 1) {
      // mix the clips first
      const tempMixPath = Path.resolve(
        tempDir,
        `audio_concat_tempmix_${itemIndex}.wav`
      );
      const inputPaths = [];
      for (const clipId of clips) {
        const rclip = renderedClips.find((rc) => rc.clip?.id === clipId);
        if (!rclip) {
          console.warn(
            "** Audio sequence specified clip '%s' is not available, can't mix",
            clipId
          );
          // TODO: render silence in this case
          continue;
        }
        inputPaths.push(rclip.wavAudioPath);

        if (duration === 'auto') {
          // assign first input clip's duration for this audio segment
          duration = rclip.duration;
        }
      }
      if (inputPaths.length > 0) {
        await createMixedAudioAsync(tempMixPath, inputPaths, duration);
        console.log(
          'rendered mixed audio for item %d at %s',
          itemIndex,
          tempMixPath
        );

        tempFilePaths.push(tempMixPath);

        clipAudioPath = tempMixPath;
      }
    } else {
      // single input, no need to mix
      const clipId = clips[0];
      const rclip = renderedClips.find((rc) => rc.clip?.id === clipId);
      if (!rclip) {
        console.warn(
          "** Audio sequence specified clip '%s' is not available",
          clipId
        );
        // TODO: render silence in this case
        continue;
      }
      clipAudioPath = rclip.wavAudioPath;
    }

    if (clipAudioPath?.length < 1) {
      console.warn(
        "** Audio sequence specified clip '%s' doesn't have rendered audio",
        clipId
      );
      // TODO: render silence in this case
      continue;
    }
    clipAudioPath = Path.relative(tempDir, clipAudioPath);

    ffmpegConcatFile += `file '${clipAudioPath}'\n`;
  }

  const concatTempPath = Path.resolve(tempDir, 'audio_concat_temp.txt');
  fs.writeFileSync(concatTempPath, ffmpegConcatFile, { encoding: 'utf-8' });

  tempFilePaths.push(concatTempPath);

  const args = ['-f', 'concat', '-i', concatTempPath, dst];

  let ret;
  try {
    ret = await runFfmpegCommandAsync(`concatAudio`, args);
  } catch (e) {
    console.error('** ffmpeg command for concat audio failed: ', e);
    throw new Error('Unable to write audio mix');
  } finally {
    for (const path of tempFilePaths) {
      fs.rmSync(path);
    }
  }

  return ret;
}

async function createMixedAudioAsync(dst, inputPaths, duration) {
  /*
    ffmpeg -i input0.mp3 -i input1.mp3 -filter_complex amix=inputs=2 output.mp3
  */
  const args = [];

  if (duration > 0) args.push('-t', duration);

  for (const inp of inputPaths) {
    args.push('-i', inp);
  }
  args.push('-filter_complex', `amix=inputs=${inputPaths.length}`, dst);

  return runFfmpegCommandAsync(`createMixedAudio`, args);
}
