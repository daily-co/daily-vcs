import * as Path from 'path';
import * as React from 'react';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

import minimist from 'minimist';

import { Composition, render } from './src/index.js';
import { makeVCSRootContainer } from './src/loader-base.js';
import { getCompPathFromId } from './comp-namespace-util.js';
import { loadFontsAsync } from './lib-node/font-loader.js';
import { prepareCompositionAtPath } from './lib-node/jsx-builder.js';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

// CLI arguments.
// --scenario is mandatory.
const argmap = minimist(process.argv.slice(2));

const scenarioPath = argmap['scenario'];
if (!scenarioPath?.length) {
  console.error(
    'Error: must provide path to scenario definition using --scenario.'
  );
  process.exit(1);
}
const outputPathPrefix = argmap['output'];

// argument is a JS file specifying the test scenario, load it as a module
const scenarioModule = await import(scenarioPath); //require(Path.resolve('.', scenarioPath)).default;
const scenario = scenarioModule.default;
if (!scenario) {
  console.error(
    'Error: no JS scenario module at: ',
    scenarioPath,
    scenarioModule
  );
  process.exit(1);
}
console.log('Scenario definition loaded: ', scenario);

let srcCompPath = getCompPathFromId(scenario.compositionId, 'node');

if (!srcCompPath?.length) {
  console.error(
    'Error: unable to find composition with id %s',
    scenario.compositionId
  );
  process.exit(1);
}

const durationInFrames = parseInt(scenario.durationInFrames) || 100;
const outputFrames = Array.isArray(scenario.outputFrames)
  ? scenario.outputFrames
  : [];

if (outputFrames.length > 0 && !outputPathPrefix?.length) {
  console.error('Scenario needs output but output path not specified');
  process.exit(1);
}

// do the JSX build step.
// it will write into a temp dir that's accessible to node's import().
// runUuid (optionally passed on CLI) will ensure any simultaneous sessions use a separate temp dir.
// assetDir provides an optional overlay of session-specific assets that may contain JSX files.
srcCompPath = await prepareCompositionAtPath(
  srcCompPath,
  scenario.compositionId,
  'test-runner' // this is the run id; for parallel test runs, a unique id should be used here (probably passed from outside as CLI arg)
);

console.log('Composition prepared, will be loaded from: ', srcCompPath);

const { compositionInterface: compInterface, default: ContentRoot } =
  await import(srcCompPath);

// mock objects to represent image sources.
// this is passed in when writing the composition into a flat scene description,
// so image/video references can be resolved.
const imageSources = { videoSlots: [], compositionAssetImages: {} };
for (let i = 0; i < 16; i++) {
  imageSources.videoSlots.push({
    vcsSourceType: 'video',
    vcsSourceId: i,
  });
}
imageSources.compositionAssetImages['test_square.png'] = {
  vcsSourceType: 'defaultAsset',
  vcsSourceId: 'test_square_320px.png',
  width: 320,
  height: 320,
};

// this will receive the instance of our root container component
const rootContainerRef = React.createRef();

let g_viewportSize = { w: 1280, h: 720 };
if (scenario.outputSize && scenario.outputSize.w && scenario.outputSize.h) {
  g_viewportSize = scenario.outputSize;
}

let g_currentFrame = 0;
const fps = 30.0;

function getVideoTime() {
  return g_currentFrame / fps;
}

main();

async function main() {
  await loadFontsAsync(compInterface ? compInterface.fontFamilies : null);

  // the backing model for our views.
  // the callback passed here will be called every time React has finished an update.
  const composition = new Composition(
    g_viewportSize,
    compUpdatedCb,
    compGetSourceMetadataCb
  );

  // bind our React reconciler with the container component and the composition model.
  // when the root container receives a state update, React will reconcile it into composition.
  render(
    makeVCSRootContainer(ContentRoot, rootContainerRef, {
      viewportSize: g_viewportSize,
      pixelsPerGridUnit: composition.pixelsPerGridUnit,
    }),
    composition
  );

  if (scenario.initialState) {
    applyScenarioState(scenario.initialState);
  }

  for (
    g_currentFrame = 0;
    g_currentFrame < durationInFrames;
    g_currentFrame++
  ) {
    if (scenario.frameWillRenderCb) {
      applyScenarioState(scenario.frameWillRenderCb(g_currentFrame));
    }

    rootContainerRef.current.setVideoTime(getVideoTime());
  }
}

function compGetSourceMetadataCb(comp, type, src) {
  let ret = {};
  if (type === 'image') {
    const desc = imageSources.compositionAssetImages[src];
    if (desc && desc.width > 0) {
      ret = { w: desc.width, h: desc.height };
    }
  }
  return ret;
}

function compUpdatedCb(comp) {
  if (!outputFrames.includes(g_currentFrame)) {
    return; // do nothing on frames if they're not part of our test output set
  }
  console.log(
    'writing requested frame %d (t %f) to: ',
    g_currentFrame,
    getVideoTime(),
    outputPathPrefix
  );

  const sceneDesc = comp.writeSceneDescription(imageSources);

  if (!sceneDesc || !sceneDesc.videoLayers) {
    console.error(
      "** comp.writeSceneDescription returned empty object, can't write output"
    );
    return;
  }

  // break down scene components to separate files,
  // since the display list will be processed by canvex.
  const { videoLayers, fgDisplayList } = sceneDesc;

  fs.writeFileSync(
    `${outputPathPrefix}_${g_currentFrame}_videolayers.json`,
    JSON.stringify(videoLayers)
  );
  fs.writeFileSync(
    `${outputPathPrefix}_${g_currentFrame}_fgdisplaylist.canvex.json`,
    JSON.stringify(fgDisplayList)
  );

  // also write a canvex display list that shows the video layers as colored rectangles.
  // this is useful for visual verification of the output.
  const videoLayersPreviewDisplayList = comp.writeVideoLayersPreview();

  fs.writeFileSync(
    `${outputPathPrefix}_${g_currentFrame}_videolayerspreview.canvex.json`,
    JSON.stringify(videoLayersPreviewDisplayList)
  );
}

function applyScenarioState(s) {
  if (!s) return;

  const { activeVideoInputSlots, params } = s;

  if (Array.isArray(activeVideoInputSlots)) {
    rootContainerRef.current.setActiveVideoInputSlots(activeVideoInputSlots);
    console.log('setActiveVideoInputSlots: ', activeVideoInputSlots);
  }
  if (params) {
    for (const key in params) {
      rootContainerRef.current.setParamValue(key, params[key]);
      console.log('setParamValue: ', params[key]);
    }
  }
}
