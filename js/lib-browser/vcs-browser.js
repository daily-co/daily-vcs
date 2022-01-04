import * as React from 'react';
import { Composition, render } from '../src';
import { renderCompInCanvas } from '../src/render/canvas';
import { makeVCSRootContainer } from '../src/loader-base';

import { loadFontsAsync } from './font-loader';

import { v4 as uuidv4 } from 'uuid';

// composition path is replaced by our webpack config
import * as VCSComp from '__VCS_COMP_PATH__';

export async function startCanvasOutputAsync(
  w,
  h,
  canvas,
  imageSources,
  updatedCb,
  opts
) {
  const {enablePreload} = opts || {};

  console.assert(w > 0 && h > 0, `startCanvasOutputAsync: Invalid viewport size specified: ${w}, ${h}`);

  const vcs = new VCSBrowserOutput(w, h);

  console.log("created renderer %s: viewport size %d * %d, canvas %d * %d", vcs.uuid, w, h, canvas.width, canvas.height);

  if (enablePreload !== undefined) {
    vcs.enableAssetPreload = enablePreload;
  }

  await vcs.initAsync(canvas, imageSources, updatedCb);

  return vcs;
}

class VCSBrowserOutput {
  constructor(w, h) {
    this.viewportSize = {w, h};

    this.uuid = uuidv4();

    // this will receive the instance of our root container component
    this.rootContainerRef = React.createRef();

    this.comp = null;
    this.compositionInterface = null;
    this.canvas = null;
    this.imageSources = {};
    this.extUpdatedCb = null;

    // playback state
    this.startT = 0;
    this.lastT = 0;
    this.stopped = false;

    // asset preloading
    this.enableAssetPreload = true;
    this.preloadContainerEl = null;

    this.getAssetUrlCb = null;
  }

  // --- asset loading utilities ---

  appendPreloadedAssetToDOM(el) {
    if (!this.enableAssetPreload) return;

    // TODO: should be delegated to the owner of this output,
    // so they can decide what to preload and where in the DOM it should go
    if (!this.preloadContainerEl) {
      this.preloadContainerEl = document.createElement('div');
      this.preloadContainerEl.className = 'vcs-asset-preload-container';
      this.preloadContainerEl.setAttribute(
        'style',
        'opacity: 0;' +
          'z-index: 1;' +
          'position: fixed;' +
          'pointer-events: none;'
      );
      if (document.body.firstElementChild) {
        document.body.insertBefore(
          this.preloadContainerEl,
          document.body.firstElementChild
        );
      } else {
        document.body.appendChild(this.preloadContainerEl);
      }
    }
    this.preloadContainerEl.appendChild(el);
  }

  getAssetUrl(name, namespace, type) {
    // owner of the output can replace this behavior by setting getAssetUrlCb
    if (type === 'font') {
      return `res/fonts/${name}`;
    }
    return name;
  }

  async initTextSystem() {
    // we don't know about any other fonts yet,
    // so just specify the default.
    const wantedFamilies = ['Roboto'];

    await loadFontsAsync(
      this.getAssetUrlCb || this.getAssetUrl.bind(this),
      this.appendPreloadedAssetToDOM.bind(this),
      wantedFamilies
    );
  }

  updateImageSources(imageSources) {
    this.imageSources = { videos: [], images: {} };

    // the image sources we've received are raw DOM elements.
    // for display list encoding, we need metadata about each source,
    // so wrap them in these drawable objects.
    for (let i = 0; i < imageSources.videos.length; i++) {
      this.imageSources.videos.push({
        vcsSourceType: 'video',
        vcsSourceId: i,
        domElement: imageSources.videos[i],
      });
    }
    for (const key in imageSources.images) {
      this.imageSources.images[key] = {
        vcsSourceType: 'defaultAsset',
        vcsSourceId: key,
        domElement: imageSources.images[key],
      };
    }
  }

  async initAsync(canvas, imageSources, updatedCb) {
    await this.initTextSystem();

    this.canvas = canvas;
    this.extUpdatedCb = updatedCb;

    this.updateImageSources(imageSources);

    // the interface definition object
    this.compositionInterface = { ...VCSComp.compositionInterface };

    // the backing model for our views.
    // the callback passed here will be called every time React has finished an update.
    this.comp = new Composition(this.viewportSize, this.compUpdated.bind(this));

    // bind our React reconciler with the container component and the composition model.
    // when the root container receives a state update, React will reconcile it into composition.
    render(
      makeVCSRootContainer(VCSComp.default, this.rootContainerRef),
      this.comp
    );

    this.startT = Date.now() / 1000;
    this.lastT = this.startT;

    requestAnimationFrame(this.renderFrame.bind(this));

    this.setDefaultParamsInComp();
  }

  setDefaultParamsInComp() {
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

  compUpdated(comp) {
    if (!this.extUpdatedCb || this.stopped) return;

    let sceneDesc;
    try {
      sceneDesc = comp.writeSceneDescription(this.imageSources);
    } catch (e) {
      console.error('unable to write scenedesc: ', e);
      return;
    }
    if (sceneDesc) this.extUpdatedCb(sceneDesc);
  }

  renderFrame() {
    if (this.stopped) return;

    const t = Date.now() / 1000;

    let renderNow = true;

    // limit frame rate to React updates
    if (t - this.lastT >= 1 / 4) {
      const videoT = t - this.startT;

      this.rootContainerRef.current.setVideoTime(videoT);

      this.lastT = t;

      const t1 = Date.now() / 1000;
      //console.log("updated react, time spent %f ms", Math.round((t1-t)*1000));
    }

    if (renderNow) {
      renderCompInCanvas(this.comp, this.canvas, this.imageSources);
    }

    requestAnimationFrame(this.renderFrame.bind(this));
  }

  // --- command API ---

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
    this.rootContainerRef.current.setActiveVideoInputSlots(arr);
  }

  setParamValue(id, value) {
    console.log('setParamValue: ', id, value);
    this.rootContainerRef.current.setParamValue(id, value);
  }

  stop() {
    this.stopped = true;
    console.log("stopped VCS output %s", this.uuid);
  }
}
