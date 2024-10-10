import * as Path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

import minimist from 'minimist';
import { v4 as uuidv4 } from 'uuid';
import webvttParser from 'webvtt-parser';

import { Composition, render } from './src/index.js';
import { makeVCSRootContainer } from './src/loader-base.js';
import { getCompPathFromId } from './comp-namespace-util.js';
import { loadFontsAsync } from './lib-node/font-loader.js';
import { prepareCompositionAtPath } from './lib-node/jsx-builder.js';
import { logToHostInfo } from './lib-node/log.js';
import { BatchState } from './lib-node/batch-util.js';
import * as ViewContexts from './src/react/contexts/index.js';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

// CLI arguments
const argmap = minimist(process.argv.slice(2));

const outputPathPrefix = argmap['output_prefix'];
if (!outputPathPrefix?.length) {
  console.error(
    'Error: must provide output dir and sequence file prefix using --output_prefix.'
  );
  process.exit(1);
}

const eventsJsonPath = argmap['events_json'];
const webVttPath = argmap['webvtt'];

if (!eventsJsonPath?.length && !webVttPath?.length) {
  console.error(
    'Error: must provide events to render using either --events_json or --webvtt.'
  );
  process.exit(1);
}

const outDir = Path.dirname(outputPathPrefix);
if (argmap['clean_output_dir']) {
  if (outDir.length < 3) {
    // sanity check
    console.error("Can't empty output dir: ", outDir);
  } else {
    logToHostInfo('Cleaning output dir: ', outDir);
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}
fs.mkdirSync(outDir, { recursive: true });

let compositionId = 'daily:baseline';
let eventsJson;
let webVttCues;

if (eventsJsonPath) {
  try {
    eventsJson = JSON.parse(
      fs.readFileSync(eventsJsonPath, { encoding: 'utf8' })
    );
  } catch (e) {
    console.error('Unable to load events JSON: ', e);
    process.exit(2);
  }
  if (!eventsJson.compositionId) {
    console.error('JSON must contain compositionId property.');
    process.exit(2);
  }
  if (!eventsJson.eventsByFrame) {
    console.error('JSON must contain eventList property (an array).');
    process.exit(2);
  }

  logToHostInfo(
    'Events loaded, count = %d',
    Object.keys(eventsJson.eventsByFrame).length
  );

  compositionId = eventsJson.compositionId;
}
if (webVttPath) {
  try {
    const parser = new webvttParser.WebVTTParser();
    const webVttTree = parser.parse(
      fs.readFileSync(webVttPath, { encoding: 'utf8' })
    );
    webVttCues = webVttTree.cues;
  } catch (e) {
    console.error('Unable to load WebVTT: ', e);
    process.exit(2);
  }
}

let srcCompPath = getCompPathFromId(compositionId, 'node');

if (!srcCompPath?.length) {
  console.error('Error: unable to find composition with id %s', compositionId);
  process.exit(1);
}

const resDir = argmap['res_dir'] || Path.resolve(__dirname, '../res');
let assetDir = Path.dirname(srcCompPath);

const videoTimeOffset = eventsJson?.videoTimeOffset || 0;
logToHostInfo('video time offset: ', videoTimeOffset);

let fps;
if (
  argmap['framesPerSecond'] != null &&
  isFinite((fps = parseFloat(argmap['framesPerSecond']))) &&
  fps > 0
) {
  // accept from CLI arg
} else if (eventsJson?.fps > 0) {
  fps = eventsJson.fps;
} else {
  fps = 30; // default
}

let durationInFrames = 100;
if (argmap['duration_frames']) {
  durationInFrames = parseInt(argmap['duration_frames']);
} else if (argmap['duration_secs']) {
  const ds = parseFloat(argmap['duration_secs']);
  durationInFrames = Math.floor(ds * fps);
  logToHostInfo(
    'duration set to %f seconds -> %d frames (at %f fps)',
    ds,
    durationInFrames,
    fps
  );
} else if (eventsJson?.durationInFrames > 0) {
  durationInFrames = parseInt(eventsJson?.durationInFrames);
  logToHostInfo(
    'duration read from eventsJson: %d frames (at %f fps)',
    durationInFrames,
    fps
  );
} else if (webVttCues?.length > 0) {
  const endT = webVttCues[webVttCues.length - 1].endTime;
  durationInFrames = Math.ceil(endT * fps);
  logToHostInfo(
    'using webvtt last cue endTime as duration: ',
    endT,
    durationInFrames
  );
}

const runUuid = uuidv4();

// do the JSX build step.
// it will write into a temp dir that's accessible to node's import().
// runUuid will ensure any simultaneous sessions use a separate temp dir.
// assetDir provides an optional overlay of session-specific assets that may contain JSX files.
srcCompPath = await prepareCompositionAtPath(
  srcCompPath,
  compositionId,
  runUuid
);

logToHostInfo('Composition prepared, will be loaded from: ', srcCompPath);

const { compositionInterface: compInterface, default: ContentRoot } =
  await import(srcCompPath);

// mock objects to represent image sources.
// this is passed in when writing the composition into a flat scene description,
// so image/video references can be resolved.
const imageSources = { videoSlots: [], assetImages: {} };
for (let i = 0; i < 16; i++) {
  imageSources.videoSlots.push({
    vcsSourceType: 'video',
    vcsSourceId: i,
  });
}

// always provide a test image
imageSources.assetImages['test_square.png'] = {
  vcsSourceType: 'defaultAsset',
  vcsSourceId: 'test_square_320px.png',
  width: 320,
  height: 320,
};

if (assetDir) {
  logToHostInfo('Looking for assets in: ', assetDir);

  // map available image assets
  const supportedImageTypes = ['.png'];

  const imagesDir = Path.resolve(assetDir, 'images');
  if (fs.existsSync(imagesDir)) {
    for (const dirent of fs.readdirSync(imagesDir, {
      withFileTypes: true,
    })) {
      if (dirent.isDirectory()) {
        logToHostInfo(
          'asset image subdirs are not supported (dirname %s)',
          dirent.name
        );
        continue;
      }
      const ext = Path.extname(dirent.name).toLowerCase();
      if (!supportedImageTypes.includes(ext)) continue;

      const relPathInRes = Path.relative(
        resDir,
        Path.resolve(imagesDir, dirent.name)
      );

      const srcDesc = {
        vcsSourceType: 'compositionAsset',
        vcsSourceId: relPathInRes,
      };

      // if there's a metadata json file for this image, read it
      const metadataFile = Path.resolve(imagesDir, dirent.name + '.json');
      if (fs.existsSync(metadataFile)) {
        try {
          const json = fs.readFileSync(metadataFile, {
            encoding: 'utf8',
          });
          const metadata = JSON.parse(json);
          logToHostInfo(
            'Parsed asset metadata at %s: ',
            metadataFile,
            metadata
          );
          if (
            Number.isFinite(metadata.width) &&
            Number.isFinite(metadata.height)
          ) {
            srcDesc.width = metadata.width;
            srcDesc.height = metadata.height;
          }
        } catch (e) {
          logToHostInfo(
            '** Error reading asset metadata at %s: ',
            metadataFile,
            e
          );
        }
      }
      imageSources.assetImages[dirent.name] = srcDesc;
    }
  }
  logToHostInfo('Loaded asset images: ', imageSources.assetImages);
}

let viewportSize = { w: 1280, h: 720 };
if (
  eventsJson &&
  eventsJson.outputSize &&
  eventsJson.outputSize.w &&
  eventsJson.outputSize.h
) {
  viewportSize = eventsJson.outputSize;
}

const batchState = new BatchState(fps, { webVttCues, videoTimeOffset });

main();

async function main() {
  let fontFamilies, params;
  if (compInterface) {
    if (Array.isArray(compInterface.fontFamilies)) {
      fontFamilies = compInterface.fontFamilies;
    }
    if (Array.isArray(compInterface.params)) {
      params = compInterface.params;
    }
  }

  await loadFontsAsync(fontFamilies);

  // the backing model for our views.
  // the callback passed here will be called every time React has finished an update.
  const composition = new Composition(
    viewportSize,
    compUpdatedCb,
    compGetSourceMetadataCb
  );

  // set param defaults based on comp's published interface.
  const paramValues = {};
  if (params) {
    for (const paramDesc of params) {
      const { id, defaultValue } = paramDesc;
      if (!id) {
        logToHostInfo('** Invalid paramDesc, no id field');
        continue;
      }
      paramValues[id] = defaultValue;
    }
  }

  // bind our React reconciler with the container component and the composition model.
  // when the root container receives a state update, React will reconcile it into composition.
  render(
    makeVCSRootContainer(
      ContentRoot,
      batchState.rootContainerRef,
      {
        viewportSize: viewportSize,
        pixelsPerGridUnit: composition.pixelsPerGridUnit,
        renderingEnvironment: ViewContexts.RenderingEnvironmentType.OFFLINE,
      },
      paramValues,
      compErrorCb
    ),
    composition
  );

  if (eventsJson?.initialState) {
    batchState.applyStateAtFrame(eventsJson.initialState);
  }

  for (
    batchState.currentFrame = 0;
    batchState.currentFrame < durationInFrames;
    batchState.currentFrame++
  ) {
    let eventsAtFrame;
    if (eventsJson) {
      eventsAtFrame = eventsJson.eventsByFrame[batchState.currentFrame];
    }

    await batchState.renderFrameWithEventState(eventsAtFrame);
  }
}

function compGetSourceMetadataCb(comp, type, src) {
  let ret = {};
  if (type === 'image') {
    const desc = imageSources.assetImages[src];
    if (desc && desc.width > 0) {
      ret = { w: desc.width, h: desc.height };
    }
  }
  return ret;
}

let compHasError = false;

function compErrorCb(error, info) {
  if (info) {
    console.error(
      '** VCS composition error during React render: %s - ',
      error,
      info.componentStack
    );
  } else {
    console.error('** VCS composition error during React render: ', error);
  }
  compHasError = true;
}

let cachedOutputJson = {
  vl: null,
  fg: null,
};

function compUpdatedCb(comp) {
  if (compHasError) {
    console.error("** Can't continue after React error");
    process.exit(9);
  }
  if (!batchState.initialStateApplied) return;

  logToHostInfo(
    'update at frame %d (t = %f)',
    batchState.currentFrame,
    batchState.getVideoTime()
  );

  const sceneDesc = comp.writeSceneDescription(imageSources);

  if (!sceneDesc) {
    console.error(
      "** comp.writeSceneDescription returned empty object, can't write output"
    );
    return;
  }

  const { videoLayers, fgDisplayList } = sceneDesc;

  const frameNum = ('' + batchState.currentFrame).padStart(6, '0');

  const vl = JSON.stringify(videoLayers);
  const fg = JSON.stringify(fgDisplayList);

  if (vl != cachedOutputJson.vl) {
    fs.writeFileSync(`${outputPathPrefix}_vl_${frameNum}.json`, vl);
    cachedOutputJson.vl = vl;
  }
  if (fg != cachedOutputJson.fg) {
    fs.writeFileSync(`${outputPathPrefix}_fg_${frameNum}.json`, fg);
    cachedOutputJson.fg = fg;
  }
}
