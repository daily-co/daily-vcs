import { IntrinsicNodeType } from "../comp-backing-model";

export function renderCompInCanvas(comp, canvas, assets) {
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const viewportW = comp.viewportSize.w;
  const viewportH = comp.viewportSize.h;

  const ctx = canvas.getContext('2d');

  ctx.save();

  ctx.scale(canvasW / viewportW, canvasH / viewportH);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, viewportW * 0.9, viewportH * 0.9);

  recurseRenderNode(ctx, comp.rootNode, comp);

  ctx.restore();
}

function recurseRenderNode(ctx, node, comp) {
  ctx.save();

  let color;

  switch (node.constructor.nodeType) {
    case IntrinsicNodeType.BOX: {
      color = 'green';
      break;
    }
    case IntrinsicNodeType.IMAGE: {
      color = 'red';
      break;
    }
    case IntrinsicNodeType.VIDEO: {
      color = 'blue';
      break;
    }
  }

  if (color) {
    ctx.fillStyle = color;

    const frame = node.layoutFrame;

    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
  }

  for (const c of node.children) {
    recurseRenderNode(ctx, c, comp);
  }

  ctx.restore();
}