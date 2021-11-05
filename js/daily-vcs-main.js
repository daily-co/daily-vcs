import * as Path from 'path';
import * as React from 'react';
import { performance } from 'perf_hooks';

import { Composition, render } from './src';
import { makeVCSRootContainer } from './src/loader-base';
import { react } from '@babel/types';


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
let g_startT = performance.now() / 1000;
let g_lastUpdateT = 0;

// benchmark state
let g_updateStats = [];


// the backing model for our views.
// the callback passed here will be called every time React has finished an update.
const composition = new Composition(function(comp) {
  const t0 = performance.now() / 1000;

  const sceneDesc = comp.writeSceneDescription(imageSources);

  if (g_lastUpdateT > 0) {
    const t1 = performance.now() / 1000;

    const json = JSON.stringify(sceneDesc);

    const t2 = performance.now() / 1000;

    const t_reactUpdate = t0 - g_lastUpdateT;
    const t_sceneDescWrite = t1 - t0;
    const t_jsonEncode = t2 - t1;

    g_updateStats.push({
      t_reactUpdate,
      t_sceneDescWrite,
      t_jsonEncode
    });

    console.log("Update complete, timings: reactUpdate %f ms, sceneDescWrite %f ms, jsonEncode %f ms",
          (t_reactUpdate*1000).toFixed(3), (t_sceneDescWrite*1000).toFixed(3), (t_jsonEncode*1000).toFixed(3));
  
    //console.log("update complete in %f ms, scene description now: ", timeElapsed_update*1000, JSON.stringify(sceneDesc));  
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
  g_lastUpdateT = performance.now() / 1000;

  const t = g_lastUpdateT - g_startT;
  rootContainerRef.current.setVideoTime(t);

  rootContainerRef.current.setParamValue('demoText', 'Hello at time '+t);
}
setInterval(updateVideoTime, 100);

// print benchmark on exit
process.on('SIGINT', function() {
  if (g_updateStats.length > 4) {
    console.log("-----");
    printStats();
  }
  process.exit();
});

function printStats() {
  function numSort(a, b) {
    return a - b;
  }
  const reactUpdateArr = g_updateStats.map(statObj => statObj.t_reactUpdate).sort(numSort);
  const sceneDescWriteArr = g_updateStats.map(statObj => statObj.t_sceneDescWrite).sort(numSort);
  const jsonEncodeArr = g_updateStats.map(statObj => statObj.t_jsonEncode).sort(numSort);

  const n = g_updateStats.length;
  const mid = Math.floor(n / 2);

  function printValues(arr, name) {
    // outliers removed for min/max
    console.log("%s median %f ms, min %f ms, max %f ms",
      name, (arr[mid]*1000).toFixed(3), (arr[1]*1000).toFixed(3), (arr[n - 2]*1000).toFixed(3));
  }
  printValues(reactUpdateArr, 'reactUpdate');
  printValues(sceneDescWriteArr, 'sceneDescWrite');
  printValues(jsonEncodeArr, 'jsonEncode');
}
