import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Composition, render } from '../src/index.js';
import { renderCompInCanvas } from '../src/render/canvas.js';
import { renderCompVideoLayersInDOM } from '../src/render/video-dom.js';
import { makeVCSRootContainer } from '../src/loader-base.js';
import * as ViewContexts from '../src/react/contexts/index.js';

import { loadFontsAsync } from './font-loader.js';

// composition path is replaced by our webpack config
import * as VCSComp from '__VCS_COMP_PATH__';

export async function startDOMOutputAsync(rootEl, w, h, imageSources, opts) {
  const {
    updateCb,
    errorCb,
    getAssetUrlCb,
    webFrameCb,
    fps = 20,
    scaleFactor = 1,
    enablePreload,
    enableSceneDescOutput,
  } = opts || {};

  console.assert(
    w > 0 && h > 0,
    `startDOMOutputAsync: Invalid viewport size specified: ${w}, ${h}`
  );

  const vcs = new VCSBrowserOutput(w, h, fps, scaleFactor, {
    updateCb,
    errorCb,
    getAssetUrlCb,
    webFrameCb,
  });

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
  constructor(w, h, fps, scaleFactor, callbacks) {
    const { updateCb, errorCb, getAssetUrlCb, webFrameCb } = callbacks;

    this.viewportSize = { w, h };

    this.isProductionBuild = VCS_BUILD_IS_PROD;

    this.uuid = uuidv4();

    // this will receive the instance of our root container component
    this.rootContainerRef = React.createRef();

    this.comp = null;
    this.compositionInterface = null;
    this.imageSources = {};

    // DOM state
    this.videoBox = null;
    this.webFrameOverlayBox = null;
    this.webFrameOverlayInFg = true;
    this.fgCanvas = null;
    this.scaleFactor = scaleFactor || 1;

    // playback state
    this.startT = 0;
    this.lastT = 0;
    this.stopped = false;
    this.inPostRoll = false;
    this.fps = fps || 20;

    // asset preloading
    this.enableAssetPreload = true;
    this.preloadContainerEl = null;

    // external callbacks
    this.updateCb = updateCb;
    this.errorCb = errorCb;
    this.getAssetUrlCb = getAssetUrlCb || this.getAssetUrl.bind(this);
    this.webFrameCb = webFrameCb;
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
    // default implementation.
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
      this.getAssetUrlCb,
      this.appendPreloadedAssetToDOM.bind(this),
      wantedFamilies
    );
  }

  async initImagePreloads() {
    // load images requested by composition
    const promises = [];
    if (
      this.compositionInterface &&
      Array.isArray(this.compositionInterface.imagePreloads)
    ) {
      for (const imgName of this.compositionInterface.imagePreloads) {
        const url = this.getAssetUrlCb(imgName, 'composition', 'image');
        if (!url) {
          console.warn('** Unable to get URL for image preload: ', imgName);
        } else {
          promises.push(
            new Promise((resolve, reject) => {
              const img = new Image();

              img.onload = () => {
                resolve({ name: imgName, image: img });
              };
              img.onerror = () => {
                const msg = `Image preload failed, composition asset '${imgName}'`;
                console.error(msg);
                reject(new Error(msg));
              };
              img.src = url;
            })
          );
        }
      }
    }
    this.preloadedImages = await Promise.all(promises);
  }

  updateImageSources(imageSources) {
    this.imageSources = { videoSlots: [], assetImages: {} };

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

    // add preload images first, then caller-provided images
    if (this.preloadedImages) {
      for (const obj of this.preloadedImages) {
        const { name, image } = obj;
        this.imageSources.assetImages[name] = {
          vcsSourceType: 'compositionAsset',
          vcsSourceId: name,
          domElement: image,
        };
      }
    }
    for (const key in imageSources.assetImages) {
      this.imageSources.assetImages[key] = {
        vcsSourceType: 'compositionAsset',
        vcsSourceId: key,
        domElement: imageSources.assetImages[key],
      };
    }

    // add the WebFrame renderer's singleton live asset
    this.imageSources.assetImages['__webframe'] = {
      vcsSourceType: 'liveAsset',
      vcsSourceId: '__webframe',
    };
  }

  resetOutputScalingCSS() {
    // this style sets up a container where elements can be added using their layout frames
    // as absolute coordinates
    const layoutContainerStyle = `position: absolute; width: 100%; height: 100%; transform: scale(${this.scaleFactor}); transform-origin: top left;`;
    this.videoBox.style = layoutContainerStyle;
    this.webFrameOverlayBox.style = layoutContainerStyle;
    this.fgCanvas.style = 'position: absolute; width: 100%; height: auto;';
  }

  setScaleFactor(v) {
    if (!Number.isFinite(v)) return;
    this.scaleFactor = v;
    this.resetOutputScalingCSS();
  }

  preprocessCompositionInterface(orig) {
    const obj = orig ? { ...orig } : {};

    if (!obj.params) {
      obj.params = [];
    } else {
      const arr = [];
      for (const paramDesc of obj.params) {
        // in production mode, skip params declared experimental
        if (this.isProductionBuild) {
          const { status } = paramDesc;
          if (status === 'experimental') continue;
        }
        arr.push(paramDesc);
      }
      obj.params = arr;
    }
    return obj;
  }

  async initRenderingAsync(rootEl, imageSources) {
    // the interface definition object.
    // initializing fonts and other preloads needs this.
    this.compositionInterface = this.preprocessCompositionInterface(
      VCSComp.compositionInterface
    );

    // load fonts and images.
    // these calls will make network loads and can take a while,
    // so do anything else we can before awaiting this.
    const textPromise = this.initTextSystem();
    const imagesPromise = this.initImagePreloads();

    // clear out the root DOM element
    let child;
    while ((child = rootEl.firstChild)) {
      rootEl.removeChild(child);
    }

    // create an inner container that will hold the styles
    const innerRoot = document.createElement('div');
    rootEl.appendChild(innerRoot);

    innerRoot.className = 'vcs-render-inner';
    innerRoot.setAttribute('id', 'vcsrender_' + this.uuid);

    innerRoot.style = `position: relative; aspect-ratio: ${this.viewportSize.w} / ${this.viewportSize.h};`;

    // create elements to contain rendering
    this.videoBox = document.createElement('div');
    this.webFrameOverlayBox = document.createElement('div');
    this.webFrameOverlayBox.id = 'vcs-webframe-overlay-container';
    this.fgCanvas = document.createElement('canvas');
    this.fgCanvas.width = this.viewportSize.w;
    this.fgCanvas.height = this.viewportSize.h;
    innerRoot.appendChild(this.videoBox);
    innerRoot.appendChild(this.fgCanvas);
    innerRoot.appendChild(this.webFrameOverlayBox);

    this.resetOutputScalingCSS();

    await imagesPromise;

    this.updateImageSources(imageSources);

    // the backing model for our views.
    // the callback passed here will be called every time React has finished an update.
    this.comp = new Composition(
      this.viewportSize,
      this.compUpdated.bind(this),
      this.compGetSourceMetadata.bind(this)
    );

    await textPromise;

    // set default values for params
    let paramValues = {};
    for (const paramDesc of this.compositionInterface.params) {
      const { id, type, defaultValue } = paramDesc;
      if (!id || id.length < 1) continue;
      if (!defaultValue) continue;

      let value = type === 'boolean' ? !!defaultValue : defaultValue;

      paramValues[id] = value;
    }

    // bind our React reconciler with the container component and the composition model.
    // when the root container receives a state update, React will reconcile it into composition.
    render(
      makeVCSRootContainer(
        VCSComp.default,
        this.rootContainerRef,
        {
          viewportSize: this.viewportSize,
          pixelsPerGridUnit: this.comp.pixelsPerGridUnit,
          renderingEnvironment:
            ViewContexts.RenderingEnvironmentType.PARTICIPANT_CLIENT,
        },
        paramValues,
        this.errorCb
      ),
      this.comp
    );

    this.startT = Date.now() / 1000;
    this.lastT = this.startT;

    requestAnimationFrame(this.renderFrame.bind(this));
  }

  compUpdated(comp, opts) {
    if (this.stopped) return;

    renderCompVideoLayersInDOM(this.comp, this.videoBox, this.imageSources);

    renderCompInCanvas(this.comp, this.fgCanvas, this.imageSources, false);

    if (this.updateCb) {
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

    if (opts && opts.newWebFrameProps) {
      //console.log('got webframe props update: ', opts.newWebFrameProps);
      if (this.webFrameCb) {
        // currently webframe is a singleton, so we always pass the same id
        const elementId = 'vcs-webframe';

        // track if the webframe has moved to background or back
        const { inBackground } = opts.newWebFrameProps;
        const parentEl = this.webFrameOverlayBox.parentElement;
        if (inBackground && this.webFrameOverlayInFg) {
          // move to background before videoBox
          parentEl.removeChild(this.webFrameOverlayBox);
          this.videoBox.insertAdjacentElement(
            'beforebegin',
            this.webFrameOverlayBox
          );

          this.webFrameOverlayInFg = false;
        } else if (!inBackground && !this.webFrameOverlayInFg) {
          // move to foreground, i.e. at end of parent box
          parentEl.removeChild(this.webFrameOverlayBox);
          parentEl.appendChild(this.webFrameOverlayBox);

          this.webFrameOverlayInFg = true;
        }

        this.webFrameCb(
          elementId,
          opts.newWebFrameProps,
          // a container already set up so that the webFrame can be absolutely positioned inside it
          this.webFrameOverlayBox
        );
      }
    }
  }

  compGetSourceMetadata(comp, type, src) {
    let ret = {};
    if (type === 'image') {
      const desc = this.imageSources.assetImages[src];
      let img;
      if (desc && (img = desc.domElement)) {
        ret = { w: img.width, h: img.height };
      }
    }
    return ret;
  }

  renderFrame() {
    if (this.stopped) return;

    const t = Date.now() / 1000;

    // limit frame rate to React updates.
    // the 5ms fudge factor here accounts for small variances in the render callback interval.
    if (t - this.lastT >= 1 / this.fps - 0.005) {
      this.lastT = t;

      const videoT = t - this.startT;

      const playbackState = this.inPostRoll ? 'postroll' : 'playing'; // type defined in TimeContext.js

      this.rootContainerRef.current.setVideoTime(videoT, playbackState);

      //const t1 = Date.now() / 1000;
      //console.log("updated react, time spent %f ms", Math.round((t1-t)*1000));
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
    //console.log('setActiveVideoInputSlots: ', JSON.stringify(arr));
    this.rootContainerRef.current.setActiveVideoInputSlots(arr);
  }

  setParamValue(id, value) {
    //console.log('setParamValue: ', id, value);
    this.rootContainerRef.current.setParamValue(id, value);
  }

  setEnabledStandardSources(arr) {
    this.rootContainerRef.current.setEnabledStandardSources(arr);
  }

  addStandardSourceMessage(id, data) {
    this.rootContainerRef.current.addStandardSourceMessage(id, data);
  }

  setRoomPeerDescriptionsById(map) {
    this.rootContainerRef.current.setRoomPeerDescriptionsById(map);
  }

  stop() {
    if (this.preloadContainerEl) {
      this.preloadContainerEl.remove();
      this.preloadContainerEl = null;
    }

    // having a postroll gives the composition time to react to an "end stream" event,
    // e.g. to display a closing slate (end titles).
    // the length of the postroll (if any) is defined by the VCS host platform.
    // 500 ms is a reasonable default - enough time to fade in a slate.
    const postrollTime = 0.5;

    this.inPostRoll = true;

    setTimeout(() => {
      this.stopped = true;
      console.log('stopped VCS output %s', this.uuid);
    }, postrollTime * 1000);
  }
}
