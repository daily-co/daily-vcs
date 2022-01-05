import * as Path from 'path';
import * as React from 'react';
import * as fs from 'fs';

import { Composition, render } from './src';
import { makeVCSRootContainer } from './src/loader-base';
import { loadFontsAsync } from './lib-node/font-loader';

// CLI arguments.
// --scenario is mandatory.
const argmap = require('minimist')(process.argv.slice(2));

const scenarioPath = argmap['scenario'];
if (!scenarioPath?.length) {
  console.error(
    'Error: must provide path to scenario definition using --scenario.'
  );
  process.exit(1);
}
const outputPathPrefix = argmap['output'];

// argument is a JS file specifying the test scenario, load it as a module
const scenario = require(Path.resolve('.', scenarioPath)).default;
if (!scenario) {
  console.error('Error: no JS scenario module at: ', scenarioPath);
  process.exit(1);
}
console.log('scenario definition loaded: ', scenario);

// currently we assume known compositions are in the example folder.
// clearly this won't go far.
const srcCompPath = `example/${scenario.compositionId}.jsx`;
const durationInFrames = parseInt(scenario.durationInFrames) || 100;
const outputFrames = Array.isArray(scenario.outputFrames)
  ? scenario.outputFrames
  : [];

if (outputFrames.length > 0 && !outputPathPrefix?.length) {
  console.error('Scenario needs output but output path not specified');
  process.exit(1);
}

const ContentRoot = require(Path.resolve('.', srcCompPath)).default;

// mock objects to represent image sources.
// this is passed in when writing the composition into a flat scene description,
// so image/video references can be resolved.
const imageSources = { videos: [], images: {} };
for (let i = 0; i < 16; i++) {
  imageSources.videos.push({
    vcsSourceType: 'video',
    vcsSourceId: i,
  });
}
imageSources.images['test_square'] = {
  vcsSourceType: 'defaultAsset',
  vcsSourceId: 'test_square_320px.png',
};

// this will receive the instance of our root container component
const rootContainerRef = React.createRef();

let g_viewportSize = {w: 1280, h: 720};
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
  await loadFontsAsync();

  // the backing model for our views.
  // the callback passed here will be called every time React has finished an update.
  const composition = new Composition(g_viewportSize, compUpdatedCb);

  // bind our React reconciler with the container component and the composition model.
  // when the root container receives a state update, React will reconcile it into composition.
  render(makeVCSRootContainer(ContentRoot, rootContainerRef), composition);

  if (scenario.initialState) {
    applyScenarioState(scenario.initialState);
  }

  for (g_currentFrame = 0; g_currentFrame < durationInFrames; g_currentFrame++) {
    if (scenario.frameWillRenderCb) {
      applyScenarioState(scenario.frameWillRenderCb(g_currentFrame));
    }

    rootContainerRef.current.setVideoTime(getVideoTime());
  }
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
