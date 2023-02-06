import { IntrinsicNodeType } from '../comp-backing-model.js';

export function encodeCompVideoSceneDesc(comp, imageSources, opts) {
  const sceneDesc = [];

  recurseEncodeNode(sceneDesc, comp.rootNode, comp, imageSources, opts);

  return sceneDesc;
}

function recurseEncodeNode(sceneDesc, node, comp, imageSources, opts) {
  let srcDrawable;

  switch (node.constructor.nodeType) {
    case IntrinsicNodeType.VIDEO: {
      srcDrawable = {
        vcsSourceType: 'video',
        vcsSourceId: node.src,
      };
      break;
    }
  }

  if (srcDrawable) {
    const frame = node.layoutFrame;

    // don't pass on fractional coordinates
    frame.x = Math.round(frame.x);
    frame.y = Math.round(frame.y);
    frame.w = Math.round(frame.w);
    frame.h = Math.round(frame.h);

    if (opts && opts.disallowNegativeFrameCoords) {
      // some destination compositors don't support negative x/y coordinates
      frame.x = Math.max(0, frame.x);
      frame.y = Math.max(0, frame.y);
      frame.w = Math.max(0, frame.w);
      frame.h = Math.max(0, frame.h);
    }

    const attrs = {};

    if (
      node.style &&
      Number.isFinite(node.style.cornerRadius_px) &&
      node.style.cornerRadius_px > 0
    ) {
      // write out camelcase, not the VCS style that puts unit after underscore
      attrs.cornerRadiusPx = node.style.cornerRadius_px;
    }
    if (node.scaleMode) {
      attrs.scaleMode = node.scaleMode;
    }

    sceneDesc.push({
      type: srcDrawable.vcsSourceType,
      id: srcDrawable.vcsSourceId,
      frame,
      attrs,
    });
  }

  for (const c of node.children) {
    recurseEncodeNode(sceneDesc, c, comp, imageSources, opts);
  }
}
