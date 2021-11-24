import * as React from 'react';
import { Composition, render } from '../src';
import { renderCompInCanvas } from '../src/render/canvas';
import { makeVCSRootContainer } from '../src/loader-base';

// the example composition
import * as VCSComp from
        '../example/hello.jsx';
        //'../example/graphics-test.jsx';


// this will receive the instance of our root container component
const rootContainerRef = React.createRef();

let g_comp;
let g_canvas;
let g_imageSources = {};
let g_extUpdatedCb;
let g_startT = 0;
let g_lastT = 0;

export function init(canvas, imageSources, updatedCb) {
  g_canvas = canvas;
  g_extUpdatedCb = updatedCb;

  g_imageSources = { videos: [], images: {} };

  // the image sources we've received are raw DOM elements.
  // for display list encoding, we need metadata about each source,
  // so wrap them in these drawable objects.
  for (let i = 0; i < imageSources.videos.length; i++) {
    g_imageSources.videos.push({
      vcsSourceType: 'video',
      vcsSourceId: i,
      domElement: imageSources.videos[i]
    });
  }
  for (const key in imageSources.images) {
    g_imageSources.images[key] = {
      vcsSourceType: 'defaultAsset',
      vcsSourceId: key,
      domElement: imageSources.images[key]
    };
  }

  // the backing model for our views.
  // the callback passed here will be called every time React has finished an update.
  g_comp = new Composition(compUpdated);

  // bind our React reconciler with the container component and the composition model.
  // when the root container receives a state update, React will reconcile it into composition.
  render(
    makeVCSRootContainer(VCSComp.default, rootContainerRef),
    g_comp);

  g_startT = Date.now() / 1000;
  g_lastT = g_startT;

  console.log("starting");

  requestAnimationFrame(renderFrame);

  return new DailyVCSCommandAPI(VCSComp.compositionInterface);
}

function compUpdated(comp) {
  if (!g_extUpdatedCb) return;
  
  const sceneDesc = comp.writeSceneDescription(g_imageSources);

  g_extUpdatedCb(sceneDesc);
}

function renderFrame() {
  const t = Date.now() / 1000;

  let renderNow = true;

  // limit frame rate to React updates
  if (t - g_lastT >= 1/4) {
    const videoT = t - g_startT;

    rootContainerRef.current.setVideoTime(videoT);

    g_lastT = t;

    const t1 = Date.now() / 1000;
    console.log("updated react, time spent %f ms", Math.round((t1-t)*1000));
  }

  if (renderNow) {
    renderCompInCanvas(g_comp, g_canvas, g_imageSources);
  }

  requestAnimationFrame(renderFrame);
}


// --- command API ---

class DailyVCSCommandAPI {
  constructor(compInterface) {
    this.compositionInterface = compInterface;

    // set default values for params now
    for (const paramDesc of this.compositionInterface.params) {
      const {id, type, defaultValue} = paramDesc;
      if (!id || id.length < 1) continue;
      if (!defaultValue) continue;

      if (type === 'boolean') {
        this.setParamValue(id, !!defaultValue);
      } else {
        this.setParamValue(id, defaultValue);
      }
    }
  }

  getCompositionInterface() {
    return {...this.compositionInterface};
  }

  setActiveParticipants(arr) {
    if (!Array.isArray(arr)) {
      console.error("** setActiveParticipants: invalid object, expected array: " + typeof arr);
      return;
    }
    console.log("setActiveParticipants: ", JSON.stringify(arr));
    rootContainerRef.current.setActiveParticipants(arr);
  }

  setParamValue(id, value) {
    console.log("setParamValue: ", id, value);
    rootContainerRef.current.setParamValue(id, value);
  }
}
