import { IntrinsicNodeType } from '../comp-backing-model';

export function renderCompVideoLayersInDOM(comp, containerEl, imageSources) {
  if (!comp.rootNode) return;

  // to reconcile existing elements, keep a list of what's there already
  // and what should be present after the update.
  const elementState = {
    initial: collectVideoLayerChildren(containerEl),
    final: {
      byLayerId: {},
      displayOrder: [],
    },
  };

  recurseRenderNode(
    containerEl,
    comp.rootNode,
    comp,
    imageSources,
    elementState
  );

  // remove layers that went away
  for (const key in elementState.initial.byLayerId) {
    if (!elementState.final.byLayerId[key]) {
      containerEl.removeChild(elementState.initial.byLayerId[key]);
    }
  }

  // reconcile displayOrder if needed
  let orderDiffers = false;
  const n = Math.min(
    elementState.initial.displayOrder.length,
    elementState.final.displayOrder.length
  );
  for (let i = 0; i < n; i++) {
    if (
      elementState.initial.displayOrder[i] !==
      elementState.final.displayOrder[i]
    ) {
      orderDiffers = true;
      break;
    }
  }
  if (orderDiffers) {
    let prev;
    for (const layerId of elementState.final.displayOrder) {
      const el = elementState.final.byLayerId[layerId];
      if (prev) {
        prev.after(el);
      } else {
        containerEl.prepend(el);
      }
      prev = el;
    }
  }
}

function collectVideoLayerChildren(containerEl) {
  const obj = {
    byLayerId: {},
    displayOrder: [],
  };
  for (let child of containerEl.childNodes) {
    let layerId = child.dataset.vcsVideoLayerId;
    if (!layerId) {
      console.warn(
        "Child in video container not tagged with layerId, this shouldn't happen: ",
        child
      );
      continue;
    }
    obj.byLayerId[layerId] = child;
    obj.displayOrder.push(layerId);
  }
  return obj;
}

function recurseRenderNode(
  containerEl,
  node,
  comp,
  imageSources,
  elementState
) {
  let srcDOM;
  let srcId;
  let isImg = false;

  switch (node.constructor.nodeType) {
    case IntrinsicNodeType.VIDEO:
      const src = imageSources.videoSlots.find(
        (s) => s.vcsSourceId === node.src
      );

      if (src && src.domElement) {
        srcId = node.src;

        if (src.domElement.nodeName === 'IMG') {
          srcDOM = src.domElement;
          isImg = true;
        } else if (src.domElement.nodeName === 'VIDEO') {
          srcDOM = src.domElement;
        } else {
          console.warn(
            'Unknown DOM element present in imageSources.videoSlots, not image or video: ',
            src.domElement
          );
        }
      }
      break;
  }

  if (srcDOM) {
    const frame = node.layoutFrame;
    frame.x = Math.round(frame.x);
    frame.y = Math.round(frame.y);
    frame.w = Math.round(frame.w);
    frame.h = Math.round(frame.h);

    // it's not enough to identify layers by just the node uuid
    // because the video node's source attribute may change;
    // instead reconcile using the uuid + source tuple.
    const layerId = node.uuid + ':' + srcId;

    let el = elementState.initial.byLayerId[layerId];
    if (!el) {
      if (isImg) {
        el = document.createElement('img');
        el.src = srcDOM.src;
      } else {
        el = document.createElement('video');
        el.srcObject = srcDOM.srcObject;
        el.setAttribute('muted', true);
        el.setAttribute('autoPlay', true);
      }
      el.setAttribute('data-vcs-video-layer-id', layerId);

      containerEl.appendChild(el);
    }

    let style = '';
    style += 'position: absolute; ';
    style += `top: ${frame.y}px; left: ${frame.x}px; `;
    style += `width: ${frame.w}px; height: ${frame.h}px; `;

    if (
      node.style &&
      Number.isFinite(node.style.cornerRadius_px) &&
      node.style.cornerRadius_px > 0
    ) {
      style += `border-radius: ${node.style.cornerRadius_px}px; `;
    }

    if (node.scaleMode) {
      const cssFit = node.scaleMode === 'fit' ? 'contain' : 'cover';
      style += `object-fit: ${cssFit}; `;
    }

    el.style = style;

    elementState.final.byLayerId[layerId] = el;
    elementState.final.displayOrder.push(layerId);
  }

  for (const c of node.children) {
    recurseRenderNode(containerEl, c, comp, imageSources, elementState);
  }
}
