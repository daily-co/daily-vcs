import * as fs from 'fs';
import * as Path from 'path';
import * as React from 'react';

import { Composition, render } from './src';
import { makeVCSRootContainer } from './src/loader-base';


// CLI arguments.
// 'comp' is a path to the JSX file to be loaded.
// 'data' is a path to a JSON file that will be watched for realtime updates.
const argmap = require('minimist')(process.argv.slice(2));
const srcCompPath = argmap['comp'];

if (!srcCompPath?.length) {
  console.error("Error: must provide --comp argument.");
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
  })
}
imageSources.images['test_square'] = {
  vcsSourceType: 'assetImage',
  vcsSourceId: 'test_square_320px.png',
};

// this will receive the instance of our root container component
const rootContainerRef = React.createRef();

// render time state
let g_startT = Date.now() / 1000;
let g_lastUpdateT = 0;

// the backing model for our views.
// the callback passed here will be called every time React has finished an update.
const composition = new Composition(function(comp) {
  const sceneDesc = comp.serializeAsSceneDescription(imageSources);

  if (g_lastUpdateT > 0) {
    const t = Date.now() / 1000;
    const timeElapsed_update = t - g_lastUpdateT;
  
    console.log("update complete in %f ms, scene description now: ", timeElapsed_update*1000, JSON.stringify(sceneDesc));  
  }
});

// bind our React reconciler with the container component and the composition model.
// when the root container receives a state update, React will reconcile it into composition.
render(makeVCSRootContainer(ContentRoot, rootContainerRef), composition);

// set up some defaults in the composition.
// the params are hardwired for example/hello
rootContainerRef.current.setActiveParticipants([true, true]);
rootContainerRef.current.setParamValue('showGraphics', true);
rootContainerRef.current.setParamValue('demoText', 'Greetings from Node');

// the videoTime render loop
function updateVideoTime() {
  g_lastUpdateT = Date.now() / 1000;

  const t = g_lastUpdateT - g_startT;
  rootContainerRef.current.setVideoTime(t);
}
setInterval(updateVideoTime, 1000);
