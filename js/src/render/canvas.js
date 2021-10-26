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

  let fillColor;
  let srcDrawable;

  switch (node.constructor.nodeType) {
    case IntrinsicNodeType.BOX: {
      fillColor = node.style.fillColor || null;
      break;
    }
    case IntrinsicNodeType.IMAGE: {
      if (node.src && node.src.length > 0) {
        srcDrawable = imageSources.images[node.src];
        if (!srcDrawable) {
          console.warn("Unable to find specified source image: ", node.src, imageSources.images);
        }
      }
      if (!srcDrawable) fillColor = 'red';
      break;
    }
    case IntrinsicNodeType.VIDEO: {
      srcDrawable = imageSources.videoElements[node.src];

      if (!srcDrawable) fillColor = 'blue';
      break;
    }
  }

  const frame = node.layoutFrame;

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
  }

  if (srcDrawable) {
    ctx.drawImage(srcDrawable, frame.x, frame.y, frame.w, frame.h);
  }

  if (node.text && node.text.length > 0) {
    ctx.fillStyle = node.style.textColor || 'white';

    let fontSize_px;
    if (isFinite(node.style.fontSize_vh) && node.style.fontSize_vh > 0) {
      fontSize_px = comp.viewportSize.h * node.style.fontSize_vh;
    } else {
      fontSize_px = node.style.fontSize_px || 24;
    }
    let fontFamily = node.style.fontFamily || 'Helvetica';
    let fontStyle = node.style.fontStyle || '';
    let fontWeight = node.style.fontWeight || '';

    ctx.font = `${fontWeight} ${fontStyle} ${fontSize_px}px ${fontFamily}`;

    // since we don't have actual font metrics in this prototype,
    // just take a guess to position the text inside the frame
    const textY = frame.y + Math.round(fontSize_px*0.8);

    ctx.fillText(node.text, frame.x, textY);
  }

  for (const c of node.children) {
    recurseRenderNode(ctx, c, comp, imageSources);
  }

  ctx.restore();
}