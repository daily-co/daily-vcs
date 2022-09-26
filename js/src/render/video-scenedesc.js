import { IntrinsicNodeType } from '../comp-backing-model.js';

export function encodeCompVideoSceneDesc(comp, imageSources) {
  const sceneDesc = [];

  recurseEncodeNode(sceneDesc, comp.rootNode, comp, imageSources);

  return sceneDesc;
}

function recurseEncodeNode(sceneDesc, node, comp, imageSources) {
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
    recurseEncodeNode(sceneDesc, c, comp, imageSources);
  }
}
