import { v4 as uuidv4 } from 'uuid';
import deepEqual from 'fast-deep-equal';

import { CanvasDisplayListEncoder } from '../src/render/canvas-display-list.js';

import {
  encodeCanvasDisplayList_fg_vlClip,
  encodeCanvasDisplayList_videoLayersPreview,
} from '../src/render/canvas.js';

import { encodeCompVideoSceneDesc } from '../src/render/video-scenedesc.js';

import { makeAttributedStringDesc } from './text/attributed-string.js';
import {
  performTextLayout,
  measureTextLayoutBlocks,
} from './text/text-layout.js';
import { getFirstEmoji } from './text/emoji.js';

import {
  VcsAnimator,
  AnimatorFunctionType,
  AnimationPredicateType,
  evaluatePredicate,
  isFrameNonZero,
  areFramesEqual,
} from './animation/index.js';

// these are the intrinsic elements that our React components are ultimately composed of.
// (think similar to 'div', 'img' etc. in React-DOM)
export const IntrinsicNodeType = {
  ROOT: 'root',
  BOX: 'box',
  EMOJI: 'emoji',
  IMAGE: 'image',
  TEXT: 'label',
  VIDEO: 'video',
  WEBFRAME: 'webframe',
};

function getDefaultGridUnitSizeForViewport(viewportSize) {
  const minDim = Math.min(viewportSize.w, viewportSize.h);
  return minDim / 36;
}

export class Composition {
  constructor(viewportSize, commitFinishedCb, sourceMetadataCb) {
    console.assert(
      viewportSize.w > 0 && viewportSize.h > 0,
      `** invalid Composition viewportSize arg: ${viewportSize}`
    );
    if (commitFinishedCb) {
      console.assert(
        typeof commitFinishedCb === 'function',
        `** invalid Composition commitFinishedCb arg: ${commitFinishedCb}`
      );
    }

    this.viewportSize = viewportSize;

    this.pixelsPerGridUnit = getDefaultGridUnitSizeForViewport(
      this.viewportSize
    );

    this.nodes = [];
    this.rootNode = null;

    this.uncommitted = true;
    this.commitFinishedCb = commitFinishedCb;

    this.sourceMetadataCb = sourceMetadataCb;

    this.currentWebFrameProps = {};
    this.currentWebFrameNode = null;
    this.lastWebFrameLayoutFrame = null;
    this.lastWebFrameOpacity = 0;
    this.lastWebFrameInBg = false;
    this.webFramePropsDidChange = false;
    this.webFrameOrderingDidChange = false;

    // animation system state
    this.animator = new VcsAnimator();
    this.activeAnimations = [];
    this.prevLayoutNodes = null; // previous frame's node state for predicates
    this.layoutAnimationsMap = null; // Map<animationId, descriptor[]> for O(1) lookup
    this.opacityAnimationsMap = null; // Map<animationId, {appear, disappear}> for opacity transitions
    this.exitingNodes = []; // nodes being animated out before removal
    this.videoTime = 0; // current video time in seconds (set by runtime before render)
  }

  createNode(type, props) {
    let node;
    switch (type) {
      case IntrinsicNodeType.ROOT:
        node = new RootNode();
        break;
      case IntrinsicNodeType.BOX:
        node = new BoxNode();
        break;
      case IntrinsicNodeType.EMOJI:
        node = new EmojiNode();
        break;
      case IntrinsicNodeType.IMAGE:
        node = new ImageNode();
        break;
      case IntrinsicNodeType.TEXT:
        node = new TextNode();
        break;
      case IntrinsicNodeType.VIDEO:
        node = new VideoNode();
        break;
      case IntrinsicNodeType.WEBFRAME:
        node = new WebFrameNode();
        this.currentWebFrameNode = node;
        this.webFrameOrderingDidChange = true;
        break;
    }

    if (!node) {
      console.error("** couldn't create node: ", type, props);
    } else {
      this.nodes.push(node);
    }

    node.commit(this, {}, props);

    return node;
  }

  deleteNode(node) {
    const idx = this.nodes.indexOf(node);
    this.nodes.splice(idx, 1);

    //console.log("deleted node at %d in array", idx)

    if (node === this.currentWebFrameNode) {
      this.currentWebFrameNode = null;
      this.webFrameOrderingDidChange = true;
    }
  }

  attachRootNode(rootNode) {
    this.rootNode = rootNode;
    for (const node of this.nodes) {
      node.container = this;
    }
  }

  prepareForFirstCommit() {
    //console.log("prepare for first commit; we have %d nodes", this.nodes.length);

    this.uncommitted = false;
  }

  didUpdateWebFramePropsInCommit(newProps) {
    const oldProps = this.currentWebFrameProps || {};
    if (
      oldProps.src !== newProps.src ||
      !isEqualViewportSize(oldProps.viewportSize, newProps.viewportSize) ||
      !isEqualWebFrameAction(oldProps.keyPressAction, newProps.keyPressAction)
    ) {
      this.webFramePropsDidChange = true;
      this.currentWebFrameProps = newProps;
    }
  }

  reactFinishedCommits() {
    this._performLayout();

    const opts = {};

    // the webframe node is a singleton, so we can watch for its layout updates here
    let webFrameLayoutUpdated = false;
    if (this.currentWebFrameNode) {
      const newFrame = this.currentWebFrameNode.layoutFrame;
      if (!isEqualLayoutFrame(this.lastWebFrameLayoutFrame, newFrame)) {
        this.lastWebFrameLayoutFrame = newFrame;
        webFrameLayoutUpdated = true;
      }
      const newOpacity = this.currentWebFrameNode.blend?.opacity;
      if (this.lastWebFrameOpacity !== newOpacity) {
        this.lastWebFrameOpacity = newOpacity;
        webFrameLayoutUpdated = true;
      }
    }

    if (
      this.webFramePropsDidChange ||
      this.webFrameOrderingDidChange ||
      webFrameLayoutUpdated
    ) {
      /*console.log(
        'wf props did change %s, ordering did change %s, layout updated %s, node: ',
        this.webFramePropsDidChange,
        webFrameLayoutUpdated,
        this.currentWebFrameNode
      );*/
      let inScene = false;
      let inBackground = false;
      let frame = null;
      let opacity = 1;
      if (this.currentWebFrameNode) {
        if (this.webFrameOrderingDidChange) {
          // detect if the webframe is behind or in front of video layers
          let wfSeen = false;
          let videoSeen = false;
          this._recurseWithVisitor((node) => {
            if (node.constructor.nodeType === IntrinsicNodeType.VIDEO) {
              videoSeen = true;
              return false;
            }
            if (node === this.currentWebFrameNode) {
              wfSeen = true;
            }
            return true;
          });
          this.lastWebFrameInBg = wfSeen && videoSeen; // in background only if there's actually video layers too
        }

        inScene = true;
        inBackground = this.lastWebFrameInBg;
        frame = this.lastWebFrameLayoutFrame;
        opacity = this.lastWebFrameOpacity;
      }

      opts.newWebFrameProps = {
        ...this.currentWebFrameProps,
        inScene,
        inBackground,
        frame,
        opacity,
      };
      this.webFramePropsDidChange = false;
      this.webFrameOrderingDidChange = false;
    }

    if (this.commitFinishedCb) {
      this.commitFinishedCb(this, opts);
    }
  }

  _recurseWithVisitor(visitFn, node) {
    if (!node) {
      node = this.rootNode;
    } else {
      if (!visitFn(node)) return false; // --
    }
    for (const c of node.children) {
      if (!this._recurseWithVisitor(visitFn, c)) {
        return false;
      }
    }
    return true;
  }

  _makeLayoutCtxHooks(node, deps, passIndex) {
    // record use of these hooks by a layout function.
    // this data could be used for caching of layout results
    // (but we're not currently doing it because it's fast enough to just recompute...)
    return {
      useIntrinsicSize: function () {
        deps.add('intrinsicSize');
        return node.intrinsicSize ? node.intrinsicSize : { w: -1, h: -1 };
      },
      useContentSize: function () {
        deps.add('contentSize');
        if (passIndex > 0 && node.flowFrame && node.flowFrame.w > 0) {
          return { w: node.flowFrame.w, h: node.flowFrame.h };
        }
        return { w: 0, h: 0 };
      },
      useChildSizes: function () {
        deps.add('childSizes');
        if (passIndex > 0) {
          return node.flowChildFrames;
        }
        return null;
      },
      useChildStacking: function (props) {
        deps.add('childStacking');
        node.childStackingProps = props || {};
      },
    };
  }

  _performLayout() {
    if (!this.rootNode) return;

    this._cleanUpFinishedAnimations();

    // save previous layout state for animation predicate evaluation
    this.prevLayoutNodes = this._captureNodeStates();

    let passIndex = 0;
    let usedDeps = new Set();
    const makeLayoutCtxHooks = this._makeLayoutCtxHooks;
    const layoutCtxBase = {
      viewport: { x: 0, y: 0, w: this.viewportSize.w, h: this.viewportSize.h },
      pixelsPerGridUnit: this.pixelsPerGridUnit,
    };

    const self = this;
    const videoTime = this.videoTime;
    let activateNewAnimations = false; // only activate on final pass

    function recurseLayout(node, parentFrame, childFrames, inheritedOpacity) {
      let frame = { ...parentFrame };

      const thisNodeDeps = new Set();
      let thisNodeChildFrames;
      let opacityForChildren = inheritedOpacity; // pass through by default

      // Handle exiting nodes - use their last frame instead of computing new layout
      if (node.isExiting) {
        const exitInfo = self.exitingNodes.find((e) => e.node === node);
        if (exitInfo?.lastFrame) {
          frame = { ...exitInfo.lastFrame };
        }
        // Skip layout computation for exiting nodes, go straight to setting frame
        node.animatableFrame = {
          x: frame.x,
          y: frame.y,
          w: frame.w,
          h: frame.h,
        };
        node.setLayoutFrame(frame);

        // Apply exit opacity animation
        let animatedOpacity = inheritedOpacity;
        if (activateNewAnimations && exitInfo) {
          const elapsed = videoTime - exitInfo.startTime;
          const progress = Math.min(
            1,
            Math.max(0, elapsed / exitInfo.duration)
          );
          const easedProgress = self._applyEasing(progress, exitInfo.easingFn);
          animatedOpacity =
            exitInfo.fromOpacity +
            (exitInfo.toOpacity - exitInfo.fromOpacity) * easedProgress;
          // Multiply with inherited opacity if present
          if (inheritedOpacity !== undefined) {
            animatedOpacity *= inheritedOpacity;
          }
        }

        // Apply animated opacity to this node
        if (animatedOpacity !== undefined) {
          node.blend = { ...(node.blend || {}), opacity: animatedOpacity };
        }

        // Still recurse to children (they follow the exiting parent, inherit opacity)
        for (const c of node.children) {
          recurseLayout(c, frame, childFrames, animatedOpacity);
        }
        return;
      }

      if (node.layoutFunc) {
        frame = node.layoutFunc(frame, node.layoutParams, {
          ...layoutCtxBase,
          ...makeLayoutCtxHooks(node, thisNodeDeps, passIndex),
          node,
        });

        for (const dep of thisNodeDeps) usedDeps.add(dep);

        const usesStacking = thisNodeDeps.has('childStacking');
        if (usesStacking) {
          frame.childStacking = node.childStackingProps;
          delete node.childStackingProps;
        }

        if (
          frame.containerTransform ||
          usesStacking ||
          thisNodeDeps.has('contentSize') ||
          thisNodeDeps.has('childSizes')
        ) {
          // capture child frames (including nested container offsets) if
          // 1) this layout node wants the content size after the first pass, or
          // 2) this node applies a container transform.
          thisNodeChildFrames = [];
        }
      }

      // capture the computed destination frame before animation
      const animatableFrame = {
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h,
      };
      node.animatableFrame = animatableFrame;

      // Process animations for this node only on the final pass (activateNewAnimations==true) to ensure:
      // 1. Predicates compare true destination frames (not frames polluted by in-progress animations)
      // 2. Content size measurement in first pass uses destination frames, not animated frames
      if (self.layoutAnimationsMap && activateNewAnimations) {
        const animationId = node.animationId || node.userGivenId;
        if (animationId) {
          const animations = self.layoutAnimationsMap.get(animationId);

          if (Array.isArray(animations)) {
            for (const adesc of animations) {
              if (self._isAnimPredicateTriggered(adesc.predicates, node)) {
                self._activateAnimation(adesc, node, videoTime);
              }
            }
          }

          // apply existing animations so children follow animated parents
          frame = self._applyActiveAnimations(node, frame, videoTime);

          // Apply appear animation if node just appeared
          const appearConfig = !node.appearAnimationCompleted
            ? self._getAppearAnimation(node)
            : null;
          if (appearConfig) {
            // Check if this is a genuinely new node or just an animationId change
            // on an already-visible node
            if (node.appearStartTime === null) {
              const prevState = self._findPrevNodeState(node.uuid);
              const wasVisibleBefore =
                prevState && isFrameNonZero(prevState.animatableFrame);

              if (wasVisibleBefore) {
                // Node was already visible - mark as "already appeared" (skip animation)
                node.appearStartTime = -Infinity;
              } else {
                // Genuinely new node - start appear animation
                node.appearStartTime = videoTime;
              }
            }

            const elapsed = videoTime - node.appearStartTime;
            if (elapsed < appearConfig.duration) {
              const progress = Math.min(
                1,
                Math.max(0, elapsed / appearConfig.duration)
              );
              const easedProgress = self._applyEasing(
                progress,
                appearConfig.function
              );
              let opacity =
                appearConfig.from +
                (appearConfig.to - appearConfig.from) * easedProgress;
              // Multiply with inherited opacity if present
              if (inheritedOpacity !== undefined) {
                opacity *= inheritedOpacity;
              }
              opacityForChildren = opacity;
            } else {
              // Animation completed — snap to final opacity value.
              // Without this, the node retains the penultimate eased value
              // (~0.979) from the prior frame indefinitely.
              node.appearAnimationCompleted = true;
              let finalOpacity = appearConfig.to;
              if (inheritedOpacity !== undefined) {
                finalOpacity *= inheritedOpacity;
              }
              opacityForChildren = finalOpacity;
            }
          }
        }
      }

      // Apply inherited/animated opacity to this node
      if (opacityForChildren !== undefined) {
        node.blend = { ...(node.blend || {}), opacity: opacityForChildren };
      }

      node.setLayoutFrame(frame);

      /*console.log(
        "  %d/ frame for node '%s' (%s): ",
        passIndex,
        node.userGivenId,
        node.constructor.nodeType,
        JSON.stringify(node.layoutFrame)
      );*/

      let offY = 0,
        offX = 0;
      for (let i = 0; i < node.children.length; i++) {
        const c = node.children[i];
        const childStartFrame = {
          x: frame.x,
          y: frame.y,
          w: frame.w,
          h: frame.h,
        };
        if (passIndex > 0 && frame.childStacking && i > 0) {
          const { direction, interval_px = 0 } = frame.childStacking;
          const prevChildFrame = thisNodeChildFrames.at(-1);
          if (direction === 'y') {
            offY += prevChildFrame.h;
            offY += interval_px;
            childStartFrame.y += offY;
          } else if (direction === 'x') {
            offX += prevChildFrame.w;
            offX += interval_px;
            childStartFrame.x += offX;
          }
        }

        recurseLayout(
          c,
          childStartFrame,
          thisNodeChildFrames || childFrames,
          opacityForChildren
        );
      }

      if (thisNodeChildFrames) {
        /*console.log(
          'child frames for node %s, frame = %s: ',
          node.userGivenId,
          JSON.stringify(frame),
          thisNodeChildFrames
        );*/
        // union of child frames
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const cf of thisNodeChildFrames) {
          minX = Math.min(cf.x, minX);
          minY = Math.min(cf.y, minY);
          maxX = Math.max(cf.x + cf.w, maxX);
          maxY = Math.max(cf.y + cf.h, maxY);
        }
        let flowFrame = { x: 0, y: 0, w: 0, h: 0 };
        if (minX < Infinity) {
          flowFrame.x = minX;
          flowFrame.y = minY;
          flowFrame.w = maxX - minX;
          flowFrame.h = maxY - minY;
        }
        if (frame.containerTransform) {
          flowFrame.x -= frame.containerTransform.x;
          flowFrame.y -= frame.containerTransform.y;
          flowFrame.w -= frame.containerTransform.w;
          flowFrame.h -= frame.containerTransform.h;
        }
        if (frame.childStacking) {
          const { direction, interval_px = 0 } = frame.childStacking;
          if (direction === 'y') {
            let h = 0;
            for (let i = 0; i < thisNodeChildFrames.length; i++) {
              const cf = thisNodeChildFrames[i];
              if (i > 0) h += interval_px;
              h += cf.h;
            }
            flowFrame.h = h;
          } else if (direction === 'x') {
            let w = 0;
            for (let i = 0; i < thisNodeChildFrames.length; i++) {
              const cf = thisNodeChildFrames[i];
              if (i > 0) w += interval_px;
              w += cf.w;
            }
            flowFrame.w = w;
          }
        }

        node.flowFrame = flowFrame;

        if (thisNodeDeps.has('childSizes')) {
          node.flowChildFrames = thisNodeChildFrames;
        }
      }

      if (childFrames) {
        // a parent wants our frame for content size calculation
        const frameInfo = node.captureFlowFrameForContainer();
        if (frameInfo) childFrames.push(frameInfo);
      }
    }

    // first pass - don't activate new animations yet (frames may be incomplete)
    activateNewAnimations = false;
    recurseLayout(this.rootNode, layoutCtxBase.viewport, null, undefined);

    // do second pass only if any node uses the content size hooks
    const needsSecondPass =
      usedDeps.has('contentSize') ||
      usedDeps.has('childSizes') ||
      usedDeps.has('childStacking');

    if (needsSecondPass) {
      passIndex = 1;
      activateNewAnimations = true; // final pass - activate animations
      recurseLayout(this.rootNode, layoutCtxBase.viewport, null, undefined);
    } else {
      // only one pass needed, so check for animations now.
      // we re-traverse but layout is already computed, so this just handles animations.
      activateNewAnimations = true;
      recurseLayout(this.rootNode, layoutCtxBase.viewport, null, undefined);
    }
  }

  // if optional 'prev' is provided, this call returns
  // only those top-level keys that have changed from 'prev'
  writeSceneDescription(imageSources, prev, opts) {
    if (!this.rootNode) {
      // this happens if the React render cycle ended up in an error state
      /*console.error(
        "** can't write scene description, composition rootNode is null (nodes len %d, uncommitted %s)",
        this.nodes.length,
        this.uncommitted
      );*/
      throw new Error('Composition setup is invalid for scene description');
    }

    // get video elements
    let videoLayers = encodeCompVideoSceneDesc(this, imageSources, opts);

    // get foreground graphics as a display list
    const encoder = new CanvasDisplayListEncoder(
      this.viewportSize.w,
      this.viewportSize.h
    );

    encodeCanvasDisplayList_fg_vlClip(this, encoder, imageSources, videoLayers);

    const fgDisplayList = encoder.finalize();

    if (videoLayers && videoLayers.length > 0) {
      videoLayers = this.validateVideoLayersOutput(videoLayers, opts);
    }

    if (prev) {
      // if the caller provides their previous cached sceneDesc,
      // only return those keys that have changed.
      // deep compare here should be fast enough because videoLayers is
      // a fairly small object, and fgDisplayList is a flat array.
      let obj = {};
      if (!deepEqual(prev.videoLayers, videoLayers))
        obj.videoLayers = videoLayers;
      if (!deepEqual(prev.fgDisplayList, fgDisplayList))
        obj.fgDisplayList = fgDisplayList;
      return obj;
    }

    return {
      videoLayers,
      fgDisplayList,
    };
  }

  validateVideoLayersOutput(videoLayers, opts) {
    // check for target-specific limitations
    if (opts?.disallowMultipleVideoLayersPerInputId) {
      // VCS elements can be composed to render the same input many times,
      // but compositing targets may not support this (if they have a fixed set
      // of output layers where each input is represented once).
      // this flag ensures we don't write incompatible output in such a setup.
      const newLayers = [];
      const usedIds = new Set();
      const duplicatedIds = new Set();
      for (const vl of videoLayers) {
        if (vl.type !== 'video' || !vl.id) continue;

        if (usedIds.has(vl.id)) {
          duplicatedIds.add(vl.id);
          continue;
        }
        newLayers.push(vl);
        usedIds.add(vl.id);
      }
      videoLayers = newLayers;

      if (duplicatedIds.size > 0) {
        console.error(
          'Composition#validateVideoLayersOutput: found and removed duplicated video ids: ',
          duplicatedIds
        );
      }
    }

    // check for overlap where a layer is completely hidden by another, which is probably a bug
    let overlapWarningMsg = '';
    let pfix = '';
    if (videoLayers.length > 1) {
      const n = videoLayers.length;
      for (let i = 0; i < n - 1; i++) {
        const { frame, id } = videoLayers[i];
        const xMin = frame.x;
        const xMax = frame.x + frame.w;
        const yMin = frame.y;
        const yMax = frame.y + frame.h;

        for (let j = i + 1; j < n; j++) {
          const { frame: topFrame, id: topId } = videoLayers[j];
          const xMin2 = topFrame.x;
          const xMax2 = topFrame.x + topFrame.w;
          const yMin2 = topFrame.y;
          const yMax2 = topFrame.y + topFrame.h;

          if (
            xMin >= xMin2 &&
            xMax <= xMax2 &&
            yMin >= yMin2 &&
            yMax <= yMax2
          ) {
            overlapWarningMsg += `${pfix}Layer ${topId} (z-index ${j}) covers ${id} (z-index ${i}) entirely`;
            pfix = ' ';
          }
        }
      }
      if (overlapWarningMsg.length > 0) {
        console.error(
          `Composition#validateVideoLayersOutput: ${overlapWarningMsg}`
        );
      }
    }

    return videoLayers;
  }

  writeVideoLayersPreview() {
    // write a display list that can be used to render a preview
    const encoder = new CanvasDisplayListEncoder(
      this.viewportSize.w,
      this.viewportSize.h
    );

    encodeCanvasDisplayList_videoLayersPreview(this, encoder);

    return encoder.finalize();
  }

  getIntrinsicSizeForImageSrc(src) {
    let ret;
    if (src && this.sourceMetadataCb) {
      ret = this.sourceMetadataCb(this, 'image', src);
    }
    // if callback didn't provide a valid size, return zero size
    if (!ret || !isFinite(ret.w) || !isFinite(ret.h)) return { w: 0, h: 0 };
    return ret;
  }

  // --- Animation system methods ---

  /**
   * Called by VCS runtime at setup if composition exports layoutAnimations.
   * Builds a Map for O(1) lookup by animationId.
   * @param {Array} animations - Array of animation descriptors with animationId
   */
  setLayoutAnimations(animations) {
    if (!Array.isArray(animations) || animations.length === 0) {
      this.layoutAnimationsMap = null;
      this.opacityAnimationsMap = null;
      return;
    }

    this.layoutAnimationsMap = new Map();
    this.opacityAnimationsMap = new Map();

    for (const anim of animations) {
      const id = anim.animationId;
      if (!id) continue;

      // check if there's an opacity animation config.
      // this is a special format that allows for separate appear/disappear (aka enter/exit) timings.
      // exit is special in the engine because it means the node needs to be kept in the tree after React has removed it.
      if (anim.opacity) {
        const opacityConfig = {
          appear: null,
          disappear: null,
        };

        if (anim.opacity.appear) {
          opacityConfig.appear = {
            from: anim.opacity.appear.from ?? 0,
            to: anim.opacity.appear.to ?? 1,
            duration: anim.opacity.appear.duration ?? 0.3,
            function:
              anim.opacity.appear.function || anim.function || 'ease-out',
          };
        }

        if (anim.opacity.disappear) {
          opacityConfig.disappear = {
            from: anim.opacity.disappear.from ?? 1,
            to: anim.opacity.disappear.to ?? 0,
            duration: anim.opacity.disappear.duration ?? 0.3,
            function:
              anim.opacity.disappear.function || anim.function || 'ease-out',
          };
        }

        if (opacityConfig.appear || opacityConfig.disappear) {
          this.opacityAnimationsMap.set(id, opacityConfig);
        }
      }

      // build layout animation descriptor (for frame properties)
      if (anim.properties && anim.properties.length > 0) {
        const desc = {
          properties: anim.properties,
          function: anim.function || 'ease',
          duration: anim.duration ?? 0.3,
          delay: anim.delay ?? 0,
          repeat: anim.repeat ?? false,
          loopBackwards: anim.loopBackwards ?? false,
          // Build predicate - default to CHANGED_FRAME_ONLY_NONZERO on current node
          predicates: [
            {
              queryPath: '.',
              propertyType:
                anim.predicate || AnimationPredicateType.CHANGED_FRAME_ONLY_NONZERO,
            },
          ],
        };

        // group by animationId (multiple descriptors can share an id)
        if (!this.layoutAnimationsMap.has(id)) {
          this.layoutAnimationsMap.set(id, []);
        }
        this.layoutAnimationsMap.get(id).push(desc);
      }
    }
  }

  /**
   * Checks if a node has a disappear animation configured.
   * Called by reconciler before removing a node.
   * @param {Object} node - The node being removed
   * @returns {boolean} True if node has disappear animation
   */
  hasDisappearAnimation(node) {
    if (!this.opacityAnimationsMap) {
      return false;
    }
    const animationId = node.animationId || node.userGivenId;
    if (!animationId) return false;
    const config = this.opacityAnimationsMap.get(animationId);
    return config?.disappear != null;
  }

  /**
   * Starts exit animation for a node.
   * Called by reconciler when a node with disappear animation is removed.
   * @param {Object} node - The node being removed
   * @param {Object} parent - The node's parent
   */
  startExitAnimation(node, parent) {
    const animationId = node.animationId || node.userGivenId;
    const config = this.opacityAnimationsMap.get(animationId);
    if (!config?.disappear) return;

    // Mark the node as exiting
    node.isExiting = true;
    node.exitStartTime = this.videoTime;

    // Determine the starting opacity for the exit animation.
    // If the node was still in its appear animation (or never even started one),
    // use its current opacity instead of the default disappear.from (which is typically 1).
    let fromOpacity = config.disappear.from;
    const appearConfig = config.appear;

    // Case 1: Node was created but never had a layout pass yet (appearStartTime is null).
    // This means it was never visible - skip exit animation entirely.
    if (appearConfig && node.appearStartTime === null) {
      // Remove node immediately instead of animating
      node.isExiting = false;
      const idx = parent.children.indexOf(node);
      if (idx >= 0) {
        parent.children.splice(idx, 1);
      }
      node.delete();
      return;
    }

    // Case 2: Node had an appear animation but it never completed
    // (the node was removed from React before the animation could progress)
    if (
      appearConfig &&
      node.appearStartTime !== null &&
      node.appearStartTime !== -Infinity &&
      !node.appearAnimationCompleted
    ) {
      // The appear animation started but never completed.
      // Calculate what opacity the node WOULD have been at, based on elapsed time.
      // But since the node was removed from React, it never actually reached that opacity.
      // We need to figure out what opacity the node was actually at when it was last rendered.

      // The node only got rendered once (at the start of the appear animation),
      // so its actual opacity is whatever it was at elapsed=0, which is appearConfig.from (typically 0).
      const actualOpacity = appearConfig.from;

      // If the node was barely visible (less than 10% opacity), skip the exit
      // animation entirely - there's nothing visible to fade out
      if (actualOpacity < 0.1) {
        // Remove node immediately instead of animating
        node.isExiting = false;
        const idx = parent.children.indexOf(node);
        if (idx >= 0) {
          parent.children.splice(idx, 1);
        }
        node.delete();
        return;
      }

      fromOpacity = actualOpacity;
    }

    const exitInfo = {
      node,
      parent,
      startTime: this.videoTime,
      duration: config.disappear.duration,
      fromOpacity,
      toOpacity: config.disappear.to,
      easingFn: config.disappear.function,
      // Store the last known frame so we can keep rendering at that position
      lastFrame: node.layoutFrame ? { ...node.layoutFrame } : null,
    };

    this.exitingNodes.push(exitInfo);
  }

  /**
   * Gets the appear animation config for a node (if any).
   * @param {Object} node - The node to check
   * @returns {Object|null} Appear animation config or null
   */
  _getAppearAnimation(node) {
    if (!this.opacityAnimationsMap) {
      return null;
    }
    const animationId = node.animationId || node.userGivenId;
    if (!animationId) return null;
    const config = this.opacityAnimationsMap.get(animationId);
    return config?.appear || null;
  }

  /**
   * Cleans up finished animations.
   * Called at the start of each layout pass.
   */
  _cleanUpFinishedAnimations() {
    const t = this.videoTime;
    this.activeAnimations = this.activeAnimations.filter(
      (anim) => t < anim.inT + anim.duration
    );

    // Clean up finished exit animations and actually remove the nodes
    const finishedExits = [];
    this.exitingNodes = this.exitingNodes.filter((exitInfo) => {
      const elapsed = t - exitInfo.startTime;
      if (elapsed >= exitInfo.duration) {
        finishedExits.push(exitInfo);
        return false; // remove from exitingNodes
      }
      return true; // keep in exitingNodes
    });

    // Now actually delete the nodes that finished their exit animations
    for (const exitInfo of finishedExits) {
      const { node, parent } = exitInfo;
      // Remove from parent's children if still there
      const idx = parent.children.indexOf(node);
      if (idx >= 0) {
        parent.children.splice(idx, 1);
      }
      // Call node's delete method to clean up
      node.delete();
    }
  }

  /**
   * Checks if there are any active animations that require continuous layout passes.
   * This includes frame property animations (x, y, w, h) and opacity animations (appear/exit).
   * Used by runtimes to determine if layout passes need to continue
   * even when React hasn't committed any changes.
   * @returns {boolean} True if layout passes are needed for animations
   */
  needsLayoutForAnimation() {
    // Check for active frame property animations
    if (this.activeAnimations.length > 0) {
      return true;
    }

    // Check for active exit animations
    if (this.exitingNodes.length > 0) {
      return true;
    }

    // Check for active appear animations by traversing the tree
    let hasAppear = false;
    this._recurseWithVisitor((node) => {
      if (
        node.appearStartTime !== null &&
        node.appearStartTime !== -Infinity &&
        !node.appearAnimationCompleted
      ) {
        hasAppear = true;
        return false; // stop recursion, we found one
      }
      return true;
    });

    return hasAppear;
  }

  /**
   * Captures current node states for animation predicate comparison.
   * @returns {Array} Array of node state snapshots
   */
  _captureNodeStates() {
    const states = [];
    this._recurseWithVisitor((node) => {
      states.push({
        uuid: node.uuid,
        userGivenId: node.userGivenId,
        animationId: node.animationId,
        animatableFrame: node.animatableFrame
          ? { ...node.animatableFrame }
          : null,
      });
      return true;
    });
    return states;
  }

  /**
   * Finds the previous frame's state for a node by UUID.
   * @param {string} uuid - Node UUID
   * @returns {Object|null} Previous node state or null
   */
  _findPrevNodeState(uuid) {
    if (!this.prevLayoutNodes) return null;
    return this.prevLayoutNodes.find((s) => s.uuid === uuid);
  }

  /**
   * Finds nodes matching a query path.
   * @param {string} queryPath - Query path ('.' for current, '*' for all, etc.)
   * @param {Object} curNode - Current node context
   * @returns {Array} Array of matching nodes
   */
  _findNodesByQuery(queryPath, curNode) {
    switch (queryPath) {
      case '.':
        // Current node
        return [curNode];

      case '/':
        // Root node
        return this.rootNode ? [this.rootNode] : [];

      case '<':
        // Immediate parent
        return curNode.parent ? [curNode.parent] : [];

      case '*': {
        // All nodes
        const allNodes = [];
        this._recurseWithVisitor((node) => {
          allNodes.push(node);
          return true;
        });
        return allNodes;
      }

      default:
        // Check for '*/id' format (node by id anywhere in tree)
        if (queryPath.startsWith('*/')) {
          const targetId = queryPath.substring(2);
          const found = [];
          this._recurseWithVisitor((node) => {
            if (
              node.userGivenId === targetId ||
              node.animationId === targetId
            ) {
              found.push(node);
            }
            return true;
          });
          return found;
        }
        return [];
    }
  }

  /**
   * Checks if any predicate in the list is triggered for a node.
   * @param {Array} predicates - Array of predicate descriptors
   * @param {Object} curNode - Current node to check
   * @returns {boolean} True if any predicate is triggered
   */
  _isAnimPredicateTriggered(predicates, curNode) {
    if (!Array.isArray(predicates) || predicates.length === 0) return false;

    for (const pred of predicates) {
      const { queryPath, propertyType } = pred;

      // Find target nodes for this query
      const targetNodes = this._findNodesByQuery(queryPath, curNode);
      if (targetNodes.length === 0) continue;

      for (const targetNode of targetNodes) {
        const prevState = this._findPrevNodeState(targetNode.uuid);

        const currentFrame = targetNode.animatableFrame;
        const prevFrame = prevState?.animatableFrame || null;
        const isPresent = !!targetNode;
        const wasPresent = !!prevState;

        if (
          evaluatePredicate(
            propertyType,
            currentFrame,
            prevFrame,
            isPresent,
            wasPresent
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Creates and stores animation instances for a node.
   * @param {Object} adesc - Animation descriptor from layoutAnimations
   * @param {Object} node - Target node
   * @param {number} videoTime - Current video time
   */
  _activateAnimation(adesc, node, videoTime) {
    const props = adesc.properties || (adesc.property ? [adesc.property] : []);
    if (!Array.isArray(props) || props.length === 0) return;
    if (!this.prevLayoutNodes) return;

    const prevState = this._findPrevNodeState(node.uuid);
    if (!prevState?.animatableFrame) return;

    const srcFrame = prevState.animatableFrame;
    const dstFrame = node.animatableFrame;

    const duration = Number.isFinite(adesc.duration) ? adesc.duration : 0.3;
    const delay = Number.isFinite(adesc.delay) ? adesc.delay : 0;

    for (const propName of props) {
      const startWith = srcFrame[propName];
      const endWith = dstFrame[propName];

      if (startWith === endWith) continue; // no change to animate

      const newAnim = this.animator.forLayoutProperty(propName, {
        inT: videoTime + delay,
        duration,
        function: adesc.function || AnimatorFunctionType.EASE,
        startWith,
        endWith,
      });
      newAnim.nodeUuid = node.uuid;

      this.activeAnimations.push(newAnim);
    }
  }

  /**
   * Applies all active animations for a node to modify its frame.
   * @param {Object} node - Target node
   * @param {Object} frame - Current computed frame
   * @param {number} videoTime - Current video time
   * @returns {Object} Modified frame (or original if no animations)
   */
  _applyActiveAnimations(node, frame, videoTime) {
    let modified = false;

    for (const anim of this.activeAnimations) {
      if (anim.nodeUuid !== node.uuid) continue;

      const outT = anim.inT + anim.duration;
      if (videoTime > outT) continue; // animation finished

      if (!modified) {
        frame = { ...frame }; // copy on first modification
        modified = true;
      }

      const v = anim.at(videoTime);
      frame[anim.propName] = v;
    }

    return frame;
  }

  /**
   * Applies easing function to a progress value (0-1).
   * @param {number} t - Progress value (0-1)
   * @param {string|Array} easingFn - Easing function name or cubic bezier array
   * @returns {number} Eased progress value
   */
  _applyEasing(t, easingFn) {
    // Clamp t to 0-1
    t = Math.max(0, Math.min(1, t));

    if (!easingFn || easingFn === 'linear') {
      return t;
    }

    // CSS standard easing functions as cubic bezier control points
    const easings = {
      ease: [0.25, 0.1, 0.25, 1],
      'ease-in': [0.42, 0, 1, 1],
      'ease-out': [0, 0, 0.58, 1],
      'ease-in-out': [0.42, 0, 0.58, 1],
    };

    let bezierPoints;
    if (typeof easingFn === 'string') {
      if (easingFn === 'hold') {
        return t < 1 ? 0 : 1;
      }
      bezierPoints = easings[easingFn];
      if (!bezierPoints) {
        return t; // Unknown easing, fall back to linear
      }
    } else if (Array.isArray(easingFn) && easingFn[0] === 'cubic') {
      bezierPoints = easingFn.slice(1);
    } else {
      return t;
    }

    // Simple cubic bezier approximation
    // For better accuracy, could use the full bezier-easing implementation
    const [x1, y1, x2, y2] = bezierPoints;
    // Approximate using cubic formula (not exact but good enough for UI animations)
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    // Newton-Raphson iteration to find t for given x
    let guess = t;
    for (let i = 0; i < 5; i++) {
      const xGuess = ((ax * guess + bx) * guess + cx) * guess;
      const xSlope = (3 * ax * guess + 2 * bx) * guess + cx;
      if (Math.abs(xSlope) < 1e-6) break;
      guess -= (xGuess - t) / xSlope;
    }

    // Calculate y for the found t
    return ((ay * guess + by) * guess + cy) * guess;
  }
}

// NaN messes up params value comparison, remove it early
function cleanLayoutParams(obj) {
  let obj2;
  for (const k in obj) {
    const v = obj[k];
    if (Number.isNaN(v)) {
      if (!obj2) obj2 = { ...obj };
      delete obj2[k];
    }
  }
  return obj2 || obj;
}

function compareFlatObj(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  const keyCount = keysA.length;
  if (keyCount !== keysB.length) return false;
  if (keyCount === 0) return true;

  for (const key of keysA) {
    const vA = a[key];
    const vB = b[key];

    // allow arrays of primitive values (e.g. RGBA colors defined as arrays)
    if (Array.isArray(vA)) {
      if (!Array.isArray(vB)) return false;
      if (vA.length !== vB.length) return false;
      for (let i = 0; i < vA.length; i++) {
        if (vA[i] !== vB[i]) return false;
      }
      continue;
    }
    // ignore object values, we don't support them for these props at all.
    // if they weren't ignored, they would trip up the comparison every time
    // because objects created in a React component's render function
    // won't be the same reference between iterations.
    if (typeof vA === 'object') {
      console.error(
        "warning: VCS Node internal compareFlatObj can't compare objects, will ignore (key '%s')",
        key
      );
      continue;
    }

    if (vA !== vB) return false;
  }
  return true;
}

function isEqualLayoutProps(oldFn, oldParams, newFn, newParams) {
  if (!oldFn && !newFn) return true;

  if (oldFn !== newFn) return false;

  if (newParams || oldParams) {
    if (newParams && !oldParams) return false;
    if (oldParams && !newParams) return false;

    if (!deepEqual(newParams, oldParams)) return false;
  }
  return true;
}

function isEqualStyle(oldStyle, newStyle) {
  if (!oldStyle && !newStyle) return true;
  if (newStyle && !oldStyle) return false;
  if (oldStyle && !newStyle) return false;

  if (!compareFlatObj(newStyle, oldStyle)) return false;

  return true;
}

function isEqualTransform(oldObj, newObj) {
  if (!oldObj && !newObj) return true;
  if (newObj && !oldObj) return false;
  if (oldObj && !newObj) return false;

  if (oldObj.scale !== newObj.scale) return false;
  if (oldObj.scaleX !== newObj.scaleX) return false;
  if (oldObj.scaleY !== newObj.scaleY) return false;
  if (oldObj.rotate_deg !== newObj.rotate_deg) return false;

  return true;
}

function isEqualBlend(oldObj, newObj) {
  if (!oldObj && !newObj) return true;
  if (newObj && !oldObj) return false;
  if (oldObj && !newObj) return false;

  if (oldObj.opacity !== newObj.opacity) return false;

  return true;
}

function isEqualViewportSize(oldSize, newSize) {
  if (!oldSize && !newSize) return true;
  if (newSize && !oldSize) return false;
  if (oldSize && !newSize) return false;

  if (oldSize.w !== newSize.w || oldSize.h !== newSize.h) return false;

  return true;
}

function isEqualLayoutFrame(oldFrame, newFrame) {
  if (!oldFrame && !newFrame) return true;
  if (newFrame && !oldFrame) return false;
  if (oldFrame && !newFrame) return false;

  if (
    oldFrame.x !== newFrame.x ||
    oldFrame.y !== newFrame.y ||
    oldFrame.w !== newFrame.w ||
    oldFrame.h !== newFrame.h
  )
    return false;

  return true;
}

function isEqualWebFrameAction(oldAction, newAction) {
  if (!oldAction && !newAction) return true;
  if (newAction && !oldAction) return false;
  if (oldAction && !newAction) return false;

  if (oldAction.name !== newAction.name) return false;
  if (oldAction.key !== newAction.key) return false;
  if (oldAction.modifiers !== newAction.modifiers) return false;

  return true;
}

class NodeBase {
  static nodeType = null; // abstract base class

  constructor() {
    this.uuid = uuidv4();
    this.userGivenId = '';
    this.animationId = null; // optional animation identifier for layout animations

    this.parent = null;
    this.children = [];
    this.container = null;

    this.layoutFunc = null;
    this.layoutParams = {};
    this.layoutFuncDeps = []; // hooks used by the layout function

    this.clip = false;

    this.animatableFrame = null; // {x, y, w, h} captured during layout for animations

    // Opacity animation state
    this.isExiting = false; // true when node is animating out before removal
    this.exitStartTime = null; // video time when exit animation started
    this.appearStartTime = null; // video time when node first appeared (for appear animation)
    this.appearAnimationCompleted = false; // true when appear animation finished (node reached full opacity)
  }

  shouldUpdate(container, oldProps, newProps) {
    // should return true only if the newProps represent a change that requires a commit.
    let newLayout = [];
    if (newProps.layout) {
      if (!Array.isArray(newProps.layout)) {
        console.error(
          'invalid layout prop passed to node, must be an array (got %s)',
          typeof newProps.layout
        );
      } else {
        newLayout = newProps.layout;
      }
    }
    if (
      !isEqualLayoutProps(
        this.layoutFunc,
        this.layoutParams,
        newLayout[0],
        newLayout[1] ? cleanLayoutParams(newLayout[1]) : {}
      )
    ) {
      //console.log("layout props will be updated for %s '%s'", this.uuid, newProps.id || '');
      return true;
    }

    if (oldProps.clip !== newProps.clip) return true;

    if (!isEqualTransform(oldProps.transform, newProps.transform)) return true;

    if (!isEqualBlend(oldProps.blend, newProps.blend)) return true;

    if (oldProps.animationId !== newProps.animationId) return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    // ensure a reference to container is available so nodes can access composition state
    // (e.g. viewport size) as part of their commit cycle
    this.container = container;

    //console.log('commit %s, %s: ', this.uuid, this.constructor.nodeType, newProps);

    if (newProps.id) this.userGivenId = newProps.id;

    // animationId for layout animations (falls back to id if not specified)
    this.animationId = newProps.animationId || null;

    if (Array.isArray(newProps.layout)) {
      const params = newProps.layout[1];

      this.layoutFunc = newProps.layout[0];
      this.layoutParams = params ? cleanLayoutParams(params) : {};
      //console.log("new layout for '%s': ", this.userGivenId, this.layoutFunc, JSON.stringify(this.layoutParams));
    } else {
      this.layoutFunc = null;
      this.layoutParams = {};
    }

    this.clip = newProps.clip;

    // we should compute a 2D transformation matrix at this point
    // and encapsulate any scale / rotate / anchor point props there
    // to make rendering easier (so that targets don't have to compute this
    // same stuff over again).
    // for now, just pass through the object received from the composition.
    this.transform = newProps.transform;

    this.blend = newProps.blend;
  }

  delete() {
    //console.log("child delete");

    this.parent = null;

    if (this.container) {
      this.container.deleteNode(this);
      this.container = null;
    }
  }

  serialize() {
    const obj = {
      type: this.constructor.nodeType,
    };
    if (this.children.length > 0) {
      obj.children = [];
      for (const c of this.children) {
        obj.children.push(c.serialize());
      }
    }
    return obj;
  }

  setLayoutFrame(frame) {
    this.layoutFrame = frame;
  }

  captureFlowFrameForContainer() {
    const frame = this.flowFrame || this.layoutFrame;
    if (!frame || !Number.isFinite(frame.w)) return null;

    return { ...frame, id: this.userGivenId }; // id for debugging only
  }
}

class RootNode extends NodeBase {
  static nodeType = IntrinsicNodeType.ROOT;

  constructor() {
    super();
    this.userGivenId = '__root';
  }
}

class StyledNodeBase extends NodeBase {
  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (!isEqualStyle(oldProps.style, newProps.style)) return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    this.style = newProps.style;
  }
}

class BoxNode extends StyledNodeBase {
  static nodeType = IntrinsicNodeType.BOX;
}

class TextNode extends StyledNodeBase {
  static nodeType = IntrinsicNodeType.TEXT;

  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (oldProps.text !== newProps.text) return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    this.text = newProps.text || '';

    if (this.text.length < 1) {
      this.attrStringDesc = null;
    } else {
      if (!this.container) {
        console.error('** container missing for text node %s', this.uuid);
        return;
      }
      this.attrStringDesc = makeAttributedStringDesc(
        this.text,
        this.style || {},
        this.container.viewportSize,
        this.container.pixelsPerGridUnit
      );

      try {
        // measure text's intrinsic size now
        this.computeTextSize();

        // if we have a known layout frame, we'll also want to update the cached text blocks
        // when the next layout frame update comes around
        if (
          this.layoutFrame &&
          this.layoutFrame.w > 0 &&
          this.layoutFrame.h > 0
        ) {
          this.flowFrameIsDirty = true;
        }
      } catch (e) {
        console.error('** exception when measuring text size: ', e);
      }
    }
  }

  setLayoutFrame(frame) {
    if (!this.flowFrameIsDirty && isEqualLayoutFrame(frame, this.layoutFrame))
      return;

    this.layoutFrame = frame;
    this.flowFrameIsDirty = false;

    this.computeTextSize(this.layoutFrame);
  }

  computeTextSize(overrideFrame) {
    let frame = overrideFrame || this.container.viewportSize;
    if (!this.attrStringDesc || !this.attrStringDesc.fragments) {
      frame.w = 0;
      frame.h = 0;
      this.flowFrame = frame;
      if (!overrideFrame) {
        this.intrinsicSize = { w: 0, h: 0 };
      }
      return;
    }

    // the text engine seems to allow a bit of overflow for a fragment on a line.
    // unclear whether it's misconfiguration somewhere down the line, or maybe
    // some kind of error/bug reading the font metrics?
    // to avoid text running out of the given bounds, add a bit of safety.
    const { textAlign, fontSize_px = 0 } = this.attrStringDesc;
    let marginL = 0,
      marginR = 0;
    /*console.log(
      'frame w %s, intrinsic w %s, safety %s',
      frame.w,
      this.intrinsicSize?.w,
      this.flowFrame?.safetyMargin
    );*/

    let safetyMargin = this.flowFrame?.safetyMargin;
    let blocks;
    let totalBox, numLines;

    // wrapped in a function so we can call again if safetymargin is adjusted
    const measure = () => {
      if (safetyMargin > 0) {
        if (textAlign === 'center') {
          marginL = marginR = safetyMargin / 2;
        } else if (textAlign === 'right') {
          marginL = safetyMargin;
        } else {
          marginR = safetyMargin;
        }
      }

      const textContainerFrame = {
        x: marginL,
        y: 0,
        width: frame && frame.w ? frame.w - marginL - marginR : Infinity,
        height: frame && frame.h ? frame.h : Infinity,
      };

      blocks = performTextLayout(this.attrStringDesc, textContainerFrame);

      ({ totalBox, numLines } = measureTextLayoutBlocks(blocks));

      /*console.log(
        'measure text: numLines %d, frame, totalBox: ',
        numLines,
        frame,
        totalBox
      );*/
    };
    measure();

    if (totalBox.w > frame.w) {
      // totally unscientific, works around text engine issue (see comment above)
      safetyMargin = Math.ceil(fontSize_px * 0.4) * 2;
      measure();
    } else {
      safetyMargin = 0;
    }

    if (numLines > 1 && frame && frame.w) {
      // for multiple lines, the width is the given max
      totalBox.w = frame.w;
    }

    this.textLayoutBlocks = blocks;
    this.textNumLines = numLines > 0 ? numLines : 0;

    // the frame adapted by the final text flow size.
    // this is accessed by the layout engine during container sizing.
    this.flowFrame = {
      x: frame.x,
      y: frame.y,
      w: Math.ceil(totalBox.w),
      h: Math.ceil(totalBox.h),
      safetyMargin: safetyMargin || undefined,
    };

    if (!overrideFrame) {
      this.intrinsicSize = {
        w: this.flowFrame.w,
        h: this.flowFrame.h,
      };
    }

    /*console.log(
      'numlines %d, intrinsicSize: ',
      this.textNumLines,
      this.intrinsicSize,
      this.textLayoutBlocks
    );*/
  }
}

class EmojiNode extends StyledNodeBase {
  static nodeType = IntrinsicNodeType.EMOJI;

  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (oldProps.value !== newProps.value) return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    const emoji = getFirstEmoji(newProps.value);
    if (emoji.length < 1) {
      if (newProps.value.length > 0) {
        console.warn(
          'Emoji built-in component initialized with non-emoji string: "%s", "%s", ',
          newProps.value,
          emoji,
          emoji.length
        );
      }
      this.emoji = null;
    } else {
      this.emoji = emoji;
    }

    const pxPerGu = this.container.pixelsPerGridUnit || 20;

    this.intrinsicSize = { w: pxPerGu, h: pxPerGu }; // a reasonable intrinsic size
  }
}

class ImageNode extends StyledNodeBase {
  static nodeType = IntrinsicNodeType.IMAGE;

  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (oldProps.src !== newProps.src) return true;

    if (oldProps.scaleMode !== newProps.scaleMode) return true;

    if (oldProps.liveAssetUpdateKey !== newProps.liveAssetUpdateKey)
      return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    this.src = newProps.src;
    this.scaleMode = newProps.scaleMode;
    this.liveAssetUpdateKey = newProps.liveAssetUpdateKey;

    this.intrinsicSize = this.container.getIntrinsicSizeForImageSrc(this.src);
  }
}

class VideoNode extends ImageNode {
  // inherits 'src', etc.
  static nodeType = IntrinsicNodeType.VIDEO;

  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (oldProps.zoom !== newProps.zoom) return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    this.zoom = newProps.zoom;
  }
}

class WebFrameNode extends ImageNode {
  // inherits 'src', etc.
  static nodeType = IntrinsicNodeType.WEBFRAME;

  static defaultViewportSize = { w: 1280, h: 720 };

  constructor() {
    super();
    this.keyPressAction = { name: '', key: '' };
  }

  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (!isEqualViewportSize(oldProps.viewportSize, newProps.viewportSize))
      return true;

    if (
      !isEqualWebFrameAction(oldProps.keyPressAction, newProps.keyPressAction)
    )
      return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    // webFrame's intrinsic size is simply the size given by the user
    this.intrinsicSize = this.viewportSize;

    // do prop eq checks again so we can record the time when they're actually updated.
    // this is useful for debugging and optimizing rendering.

    const newViewportSize =
      newProps.viewportSize || this.constructor.defaultViewportSize;
    if (!isEqualViewportSize(oldProps.viewportSize, newViewportSize)) {
      this.viewportSize = newViewportSize;

      this.viewportSizeLastUpdateTs = Date.now() / 1000;
    }

    if (!isEqualWebFrameAction(this.keyPressAction, newProps.keyPressAction)) {
      this.keyPressAction = newProps.keyPressAction || { name: '', key: '' };

      this.keyPressActionLastUpdateTs = Date.now() / 1000;
    }

    container.didUpdateWebFramePropsInCommit({
      src: this.src,
      viewportSize: this.viewportSize,
      keyPressAction: this.keyPressAction,
    });
  }
}
