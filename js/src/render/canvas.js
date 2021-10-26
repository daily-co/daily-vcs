import { IntrinsicNodeType } from "../comp-backing-model";

export function renderCompInCanvas(comp, canvas, imageSources) {
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const viewportW = comp.viewportSize.w;
  const viewportH = comp.viewportSize.h;

  const ctx = canvas.getContext('2d');

  ctx.save();

  ctx.scale(canvasW / viewportW, canvasH / viewportH);

  ctx.clearRect(0, 0, viewportW, viewportH);

  recurseRenderNode(ctx, comp.rootNode, comp, imageSources);

  ctx.restore();
}

function recurseRenderNode(ctx, node, comp, imageSources) {
  ctx.save();

  let color;
  let srcDrawable;

  switch (node.constructor.nodeType) {
    case IntrinsicNodeType.BOX: {
      color = node.style.fillColor || null;
      break;
    }
    case IntrinsicNodeType.IMAGE: {
      if (node.src && node.src.length > 0) {
        srcDrawable = imageSources.images[node.src];
        if (!srcDrawable) {
          console.warn("Unable to find specified source image: ", node.src, imageSources.images);
        }
      }
      if (!srcDrawable) color = 'red';
      break;
    }
    case IntrinsicNodeType.VIDEO: {
      srcDrawable = imageSources.videoElements[node.src];

      if (!srcDrawable) color = 'blue';
      break;
    }
  }

  const frame = node.layoutFrame;

  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
  }

  if (srcDrawable) {
    ctx.drawImage(srcDrawable, frame.x, frame.y, frame.w, frame.h);
  }

  for (const c of node.children) {
    recurseRenderNode(ctx, c, comp, imageSources);
  }

  ctx.restore();
}