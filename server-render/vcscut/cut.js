import * as fs from 'node:fs';
import * as Path from 'node:path';
import { parseArgs } from 'node:util';

import {
  getFullMovieMetadataAsync,
  findBasicVideoPropsInMovieMetadata,
} from './ffmetadata.js';
import { extractWavAudioAsync, extractYuvSeqAsync } from './ffinput.js';
import {
  createAudioFromCutAsync,
  createMovieFromYuvSeqsAsync,
} from './ffoutput.js';
import { parseClipTime } from './timeutil.js';

const args = parseArgs({
  options: {
    input: {
      type: 'string',
      short: 'i',
    },
    output: {
      type: 'string',
      short: 'o',
    },
    fps: {
      type: 'string',
    },
    w: {
      type: 'string',
    },
    h: {
      type: 'string',
    },
  },
});

let outputDir = args.values.output;
if (!outputDir || outputDir.length < 1) {
  outputDir = './cut-tmp';
}

fs.mkdirSync(outputDir, { recursive: true });

const edlJsonPath = args.values.input;
if (!edlJsonPath || edlJsonPath.length < 1) {
  console.error('input is required');
  process.exit(1);
}

const edl = JSON.parse(fs.readFileSync(edlJsonPath, { encoding: 'utf8' }));

let defaultFps = 30;
let outputSize = {
  w: 1280,
  h: 720,
};
if (parseFloat(args.values.fps) > 0) defaultFps = parseFloat(args.values.fps);
if (parseFloat(args.values.w) > 0) outputSize.w = parseFloat(args.values.w);
if (parseFloat(args.values.h) > 0) outputSize.h = parseFloat(args.values.h);

let reelId = edl.reelId;
if (!reelId || reelId.length < 1) {
  const filename = Path.basename(edlJsonPath);
  const idx = filename.indexOf('.');
  reelId = idx > 0 ? filename.substring(0, idx) : filename;
}

console.log(
  "reel id '%s', output size %d * %d, fps %f",
  reelId,
  outputSize.w,
  outputSize.h,
  defaultFps
);

const sourcesById = new Map();
for (let source of edl.sources) {
  const { id } = source;
  if (!id) {
    console.error('** Invalid source: ', source);
    process.exit(2);
  }

  sourcesById[id] = source = { ...source };

  if (!source.metadata) {
    if (!fs.existsSync(source.path)) {
      throw new Error(`Source path doesn't exist: ${source.path}`);
    }
    const metadata = await getFullMovieMetadataAsync(source.path);

    source.videoMetadata = findBasicVideoPropsInMovieMetadata(metadata);

    if (source.videoMetadata?.fps > 0) {
      defaultFps = source.videoMetadata?.fps;
      console.log('setting fps for cut: ', defaultFps);
    }
  }
}

// VCS video inputs need numeric ids.
// we assign each clip an id starting here
let curInputId = 1001;
const renderedClips = [];

if (1) {
  for (const clip of edl.clips) {
    const { start, duration, id, source: sourceId } = clip;
    if (!start || !duration || !id || !sourceId) {
      console.error('** Invalid clip: ', clip);
      continue;
    }
    const source = sourcesById[sourceId];
    if (!source || !source.path) {
      console.error('** Source not found for clip: ', clip);
      continue;
    }
    const { w, h, fps } = source.videoMetadata;

    const dstDir = Path.resolve(outputDir, id);
    try {
      fs.rmSync(dstDir, { recursive: true });
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error('Error removing temp dir %s: ', dstDir, e);
        process.exit(2);
      }
    }
    fs.mkdirSync(dstDir);

    const dstPathFormat = `${dstDir}/${id}_%06d.yuv`;

    await extractYuvSeqAsync(id, source.path, dstPathFormat, start, duration);

    const audioDstPath = `${dstDir}/${id}.wav`;

    await extractWavAudioAsync(id, source.path, audioDstPath, start, duration);

    console.log("---- processed clip '%s' -----\n", id);

    // assign a numeric input id to this clip
    const videoInputId = curInputId++;

    renderedClips.push({
      clip,
      videoInputId,
      seqDir: dstDir,
      wavAudioPath: audioDstPath,
      w,
      h,
      fps,
      duration,
    });
  }
}

if (edl.cut) {
  if (edl.cut.audio) {
    await createAudioFromCutAsync(
      Path.resolve(outputDir, `cut_audio_mix.m4a`),
      edl.cut.audio,
      renderedClips,
      outputDir
    );
    console.log('---- audio cut written ----\n\n');
  }

  writeVcsIntermediatesForCut(edl.cut, renderedClips, `${outputDir}/cut`);
}

if (0) {
  // debug output - write clip slates
  writeVcsIntermediatesForClipSlates(
    renderedClips,
    `${outputDir}/clips_with_slates`
  );
}

if (0) {
  // debug output - write clips
  createMovieFromYuvSeqsAsync(
    Path.resolve(outputDir, `${reelId}_clips.mp4`),
    1280,
    720,
    defaultFps,
    rsources
  );
}

// --- cut functions ---

function writeVcsIntermediatesForClipSlates(renderedClips, outFilePrefix) {
  const fps = defaultFps;

  const vcsBatch = {
    compositionId: 'daily:baseline',
    durationInFrames: 0, // will be filled out below
    framesPerSecond: fps,
    outputSize,
    eventsByFrame: {},
  };

  const vcsRenderInputTimings = {
    durationInFrames: 0, // will be filled out below
    playbackEvents: [],
  };

  // for each clip, show a slate with its name
  const slateDur = 3;
  let totalDur = 0;
  let curT = 0;

  for (const rclip of renderedClips) {
    const { clip, videoInputId, seqDir, w, h, fps } = rclip;
    const { duration: durationTc, id: clipId, description } = clip;
    const duration = parseClipTime(durationTc);

    totalDur += slateDur + duration;

    const slateFrame = Math.floor(curT * fps);
    curT += slateDur;

    const slateEv = {
      activeVideoInputSlots: [],
      params: {
        showTitleSlate: true,
        'titleSlate.enableFade': false,
        'titleSlate.title': `Clip ${clipId}`,
        'titleSlate.subtitle': description || '',
      },
    };
    vcsBatch.eventsByFrame[slateFrame] = slateEv;

    const clipFrame = Math.floor(curT * fps);
    curT += duration;

    const clipEv = {
      activeVideoInputSlots: [{ id: videoInputId }],
      params: {
        showTitleSlate: false,
        mode: 'single',
      },
    };
    vcsBatch.eventsByFrame[clipFrame] = clipEv;

    vcsRenderInputTimings.playbackEvents.push({
      frame: clipFrame,
      videoInputId,
      durationInFrames: Math.ceil(duration * fps),
      clipId: clip.id,
      seqDir,
      w,
      h,
    });
  }

  vcsRenderInputTimings.durationInFrames = vcsBatch.durationInFrames =
    Math.ceil(totalDur * fps);

  // -- write
  const batchJson = JSON.stringify(vcsBatch, null, 2);
  const inputTimings = JSON.stringify(vcsRenderInputTimings, null, 2);

  const batchOutFile = `${outFilePrefix}.vcsevents.json`;
  const inputTimingsOutFile = `${outFilePrefix}.vcsinputtimings.json`;

  fs.writeFileSync(batchOutFile, batchJson, { encoding: 'utf8' });
  fs.writeFileSync(inputTimingsOutFile, inputTimings, { encoding: 'utf8' });

  console.log(
    'JSON written to two files:\n%s\n%s',
    Path.resolve(batchOutFile),
    Path.resolve(inputTimingsOutFile)
  );
}

function writeVcsIntermediatesForCut(cut, renderedClips, outFilePrefix) {
  const { duration: totalDurationTc, events: cutEvents } = cut;
  const totalDuration = parseClipTime(totalDurationTc);

  const fps = defaultFps;

  const vcsBatch = {
    compositionId: 'daily:baseline',
    durationInFrames: Math.floor(totalDuration * fps),
    framesPerSecond: fps,
    outputSize,
    eventsByFrame: {},
  };

  const vcsRenderInputTimings = {
    durationInFrames: vcsBatch.durationInFrames,
    playbackEvents: [],
  };

  for (const cutEv of cutEvents) {
    /*
      {
        "t": "3",
        "clips": ["s1"],
        "params": {
          "showTitleSlate": false
        }
      }
    */
    const { t: tc, clips, params } = cutEv;
    const t = parseClipTime(tc);
    const frame = Math.floor(t * fps);
    const batchEv = {};

    if (clips?.length > 0) {
      for (const clipId of clips) {
        const rclip = renderedClips.find((rc) => rc.clip?.id === clipId);
        if (!rclip) {
          throw new Error(`Cut specifies clip '${clipId}' that doesn't exist`);
        }
        const { videoInputId, seqDir, w, h, fps } = rclip;
        const { duration: durationTc } = rclip.clip;
        const duration = parseClipTime(durationTc);

        vcsRenderInputTimings.playbackEvents.push({
          frame,
          videoInputId,
          durationInFrames: Math.ceil(duration * fps),
          clipId,
          seqDir,
          w,
          h,
        });

        if (!batchEv.activeVideoInputSlots) batchEv.activeVideoInputSlots = [];
        batchEv.activeVideoInputSlots.push({
          id: videoInputId,
        });
      }
    }

    if (params && Object.keys(params).length > 0) {
      batchEv.params = { ...params };
    }

    vcsBatch.eventsByFrame[frame] = batchEv;
  }

  // -- write
  const batchJson = JSON.stringify(vcsBatch, null, 2);
  const inputTimings = JSON.stringify(vcsRenderInputTimings, null, 2);

  const batchOutFile = `${outFilePrefix}.vcsevents.json`;
  const inputTimingsOutFile = `${outFilePrefix}.vcsinputtimings.json`;

  fs.writeFileSync(batchOutFile, batchJson, { encoding: 'utf8' });
  fs.writeFileSync(inputTimingsOutFile, inputTimings, { encoding: 'utf8' });

  console.log(
    'JSON written to two files:\n%s\n%s',
    Path.resolve(batchOutFile),
    Path.resolve(inputTimingsOutFile)
  );
}
