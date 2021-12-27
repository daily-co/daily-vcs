import * as React from 'react';
import { Composition, render } from '../src';
import { renderCompInCanvas } from '../src/render/canvas';
import { makeVCSRootContainer } from '../src/loader-base';

import { loadFontsAsync } from './font-loader';

// composition path is replaced by our webpack config
import * as VCSComp from '__VCS_COMP_PATH__';

// this will receive the instance of our root container component
const g_rootContainerRef = React.createRef();
// TODO: wrap these g_* in an object so we can load multiple instances
// of the renderer into one HTML page
let g_comp;
let g_canvas;
let g_imageSources = {};
let g_extUpdatedCb;
let g_startT = 0;
let g_lastT = 0;

// --- asset loading utilities ---

let g_preloadContainerEl;

function appendPreloadedAssetToDOM(el) {
  if (!g_preloadContainerEl) {
    g_preloadContainerEl = document.createElement('div');
    g_preloadContainerEl.className = 'asset-preload-container';
    g_preloadContainerEl.setAttribute(
      'style',
      'opacity: 0;' +
        'z-index: 1;' +
        'position: fixed;' +
        'pointer-events: none;'
    );
    if (document.body.firstElementChild) {
      document.body.insertBefore(
        g_preloadContainerEl,
        document.body.firstElementChild
      );
    } else {
      document.body.appendChild(g_preloadContainerEl);
    }
  }
  g_preloadContainerEl.appendChild(el);
}

function getAssetUrl(name, namespace, type) {
  if (type === 'font') {
    return `res/fonts/${name}`;
  }
  return name;
}

async function initTextSystem() {
  // we don't know about any other fonts yet,
  // so just specify the default.
  const wantedFamilies = ['Roboto'];

  await loadFontsAsync(getAssetUrl, appendPreloadedAssetToDOM, wantedFamilies);
}

function updateImageSources(imageSources) {
  g_imageSources = { videos: [], images: {} };

  // the image sources we've received are raw DOM elements.
  // for display list encoding, we need metadata about each source,
  // so wrap them in these drawable objects.
  for (let i = 0; i < imageSources.videos.length; i++) {
    g_imageSources.videos.push({
      vcsSourceType: 'video',
      vcsSourceId: i,
      domElement: imageSources.videos[i],
    });
  }
  for (const key in imageSources.images) {
    g_imageSources.images[key] = {
      vcsSourceType: 'defaultAsset',
      vcsSourceId: key,
      domElement: imageSources.images[key],
    };
  }
}

export async function initAsync(canvas, imageSources, updatedCb) {
  await initTextSystem();

  g_canvas = canvas;
  g_extUpdatedCb = updatedCb;

  updateImageSources(imageSources);

  // the backing model for our views.
  // the callback passed here will be called every time React has finished an update.
  g_comp = new Composition(compUpdated);

  // bind our React reconciler with the container component and the composition model.
  // when the root container receives a state update, React will reconcile it into composition.
  render(makeVCSRootContainer(VCSComp.default, g_rootContainerRef), g_comp);

  g_startT = Date.now() / 1000;
  g_lastT = g_startT;

  requestAnimationFrame(renderFrame);

  return new DailyVCSCommandAPI(VCSComp.compositionInterface);
}

function compUpdated(comp) {
  if (!g_extUpdatedCb) return;

  let sceneDesc;
  try {
    sceneDesc = comp.writeSceneDescription(g_imageSources);
  } catch (e) {
    console.error("unable to write scenedesc: ", e);
    return;
  }
  if (sceneDesc) g_extUpdatedCb(sceneDesc);
}

function renderFrame() {
  const t = Date.now() / 1000;

  let renderNow = true;

  // limit frame rate to React updates
  if (t - g_lastT >= 1 / 4) {
    const videoT = t - g_startT;

    g_rootContainerRef.current.setVideoTime(videoT);

    g_lastT = t;

    const t1 = Date.now() / 1000;
    //console.log("updated react, time spent %f ms", Math.round((t1-t)*1000));
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
      const { id, type, defaultValue } = paramDesc;
      if (!id || id.length < 1) continue;
      if (!defaultValue) continue;

      if (type === 'boolean') {
        this.setParamValue(id, !!defaultValue);
      } else {
        this.setParamValue(id, defaultValue);
      }
    }
  }

  getCompositionInterface() {
    return { ...this.compositionInterface };
  }

  setActiveVideoInputSlots(arr) {
    if (!Array.isArray(arr)) {
      console.error(
        '** setActiveVideoInputSlots: invalid object, expected array: ' +
          typeof arr
      );
      return;
    }
    console.log('setActiveVideoInputSlots: ', JSON.stringify(arr));
    g_rootContainerRef.current.setActiveVideoInputSlots(arr);
  }

  setParamValue(id, value) {
    console.log('setParamValue: ', id, value);
    g_rootContainerRef.current.setParamValue(id, value);
  }

  selectMode(modeId) {
    g_rootContainerRef.current.selectMode(modeId);
  }

  updateImageSources(srcs) {
    console.log("updating image sources");
    updateImageSources(srcs);
  }
}
