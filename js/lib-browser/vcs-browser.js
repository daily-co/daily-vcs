import * as React from 'react';
import { Composition, render } from '../src';
import { renderCompInCanvas } from '../src/render/canvas';
import { renderCompVideoLayersInDOM } from '../src/render/video-dom';
import { makeVCSRootContainer } from '../src/loader-base';

import { loadFontsAsync } from './font-loader';

import { v4 as uuidv4 } from 'uuid';

// composition path is replaced by our webpack config
import * as VCSComp from '__VCS_COMP_PATH__';

export async function startDOMOutputAsync(rootEl, w, h, imageSources, opts) {
  const {
    updateCb,
    errorCb,
    fps = 10,
    scaleFactor = 1,
    enablePreload,
    enableSceneDescOutput,
  } = opts || {};

  console.assert(
    w > 0 && h > 0,
    `startDOMOutputAsync: Invalid viewport size specified: ${w}, ${h}`
  );

  const vcs = new VCSBrowserOutput(w, h, fps, scaleFactor, updateCb, errorCb);

  console.log('created renderer %s: viewport size %d * %d', vcs.uuid, w, h);

  if (typeof enablePreload === 'boolean') {
    vcs.enableAssetPreload = enablePreload;
  }
  if (typeof enableSceneDescOutput === 'boolean') {
    vcs.enableSceneDescOutput = enableSceneDescOutput;
  }

  await vcs.initRenderingAsync(rootEl, imageSources);

  return vcs;
}

class VCSBrowserOutput {
  constructor(w, h, fps, scaleFactor, updateCb, errorCb) {
    this.viewportSize = { w, h };

    this.uuid = uuidv4();

    // this will receive the instance of our root container component
    this.rootContainerRef = React.createRef();

    this.comp = null;
    this.compositionInterface = null;
    this.imageSources = {};

    // DOM state
    this.videoBox = null;
    this.fgCanvas = null;
    this.scaleFactor = scaleFactor || 1;

    // playback state
    this.startT = 0;
    this.lastT = 0;
    this.stopped = false;
    this.fps = fps || 15;

    // asset preloading
    this.enableAssetPreload = true;
    this.preloadContainerEl = null;

    // external callbacks
    this.updateCb = updateCb;
    this.errorCb = errorCb;
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
    // load fonts requested by composition.
    // if empty, text system will just load default font.
    let wantedFamilies;
    if (
      this.compositionInterface &&
      Array.isArray(this.compositionInterface.fontFamilies)
    ) {
      wantedFamilies = this.compositionInterface.fontFamilies;
      console.log('got font families from comp: ', wantedFamilies);
    }

    await loadFontsAsync(
      this.getAssetUrlCb || this.getAssetUrl.bind(this),
      this.appendPreloadedAssetToDOM.bind(this),
      wantedFamilies
    );
  }

  updateImageSources(imageSources) {
    this.imageSources = { videoSlots: [], compositionAssetImages: {} };

    // the image sources we've received are raw DOM elements.
    // for display list encoding, we need metadata about each source,
    // so wrap them in these drawable objects.
    for (let i = 0; i < imageSources.videoSlots.length; i++) {
      const { id, element } = imageSources.videoSlots[i];
      this.imageSources.videoSlots.push({
        vcsSourceType: 'video',
        vcsSourceId: id !== undefined ? id : i,
        domElement: element,
      });
    }
    for (const key in imageSources.compositionAssetImages) {
      this.imageSources.compositionAssetImages[key] = {
        vcsSourceType: 'compositionAsset',
        vcsSourceId: key,
        domElement: imageSources.compositionAssetImages[key],
      };
    }
  }

  async initRenderingAsync(rootEl, imageSources) {
    // the interface definition object.
    // initializing fonts and other preloads needs this.
    this.compositionInterface = { ...VCSComp.compositionInterface };

    // load fonts. this call will make network loads and can take a while,
    // so do anything else we can before awaiting this.
    const textPromise = this.initTextSystem();

    // clear out the root DOM element
    let child;
    while ((child = rootEl.firstChild)) {
      rootEl.removeChild(child);
    }

    rootEl.style = `position: relative;`;

    // create elements to contain rendering
    this.videoBox = document.createElement('div');
    this.fgCanvas = document.createElement('canvas');
    rootEl.appendChild(this.videoBox);
    rootEl.appendChild(this.fgCanvas);

    this.videoBox.style = `position: absolute; width: 100%; height: 100%; transform: scale(${this.scaleFactor}); transform-origin: top left;`;

    this.fgCanvas.width = this.viewportSize.w;
    this.fgCanvas.height = this.viewportSize.h;
    this.fgCanvas.style = 'position: absolute; width: 100%; height: auto;';

    this.updateImageSources(imageSources);

    // the backing model for our views.
    // the callback passed here will be called every time React has finished an update.
    this.comp = new Composition(this.viewportSize, this.compUpdated.bind(this));

    await textPromise;

    // bind our React reconciler with the container component and the composition model.
    // when the root container receives a state update, React will reconcile it into composition.
    render(
      makeVCSRootContainer(
        VCSComp.default,
        this.rootContainerRef,
        this.viewportSize,
        this.errorCb
      ),
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
    if (!this.updateCb || this.stopped) return;

    let sceneDesc;
    if (this.enableSceneDescOutput) {
      // the caller may not need the scene description if they just render
      // directly from the model, so only write if requested.
      try {
        sceneDesc = comp.writeSceneDescription(this.imageSources);
      } catch (e) {
        console.error('unable to write scenedesc: ', e);
        return;
      }
    }
    if (sceneDesc) this.updateCb(sceneDesc);
  }

  renderFrame() {
    if (this.stopped) return;

    const t = Date.now() / 1000;

    let renderNow = true;

    // limit frame rate to React updates
    if (t - this.lastT >= 1 / this.fps) {
      const videoT = t - this.startT;

      this.rootContainerRef.current.setVideoTime(videoT);

      this.lastT = t;

      const t1 = Date.now() / 1000;
      //console.log("updated react, time spent %f ms", Math.round((t1-t)*1000));
    }

    if (renderNow) {
      renderCompVideoLayersInDOM(this.comp, this.videoBox, this.imageSources);

      renderCompInCanvas(this.comp, this.fgCanvas, this.imageSources, false);
    }

    requestAnimationFrame(this.renderFrame.bind(this));
  }

  captureFrameInCanvas(canvas) {
    renderCompInCanvas(this.comp, canvas, this.imageSources, true);
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
    console.log('stopped VCS output %s', this.uuid);
  }
}
