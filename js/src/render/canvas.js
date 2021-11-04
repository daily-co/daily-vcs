import { IntrinsicNodeType } from "../comp-backing-model";
import { roundRect } from "./canvas-utils";

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

export function encodeCompIntoCanvasDisplayList(comp, canvasDL, imageSources) {
  const ctx = canvasDL.getContext();

  recurseRenderNode(ctx, comp.rootNode, comp, imageSources);
}

function recurseRenderNode(ctx, node, comp, imageSources) {
  const isVCSDisplayListEncoder = typeof ctx.drawImage_vcsDrawable === 'function';

  if (isVCSDisplayListEncoder) {
    if (node.constructor.nodeType === IntrinsicNodeType.VIDEO) {
      // don't encode video elements into canvas commands, they are handled separately
      return;
    }
  }

  const frame = node.layoutFrame;

  ctx.save();

  if (node.transform) {
    const {rotate_deg} = node.transform;

    if (Math.abs(rotate_deg) > 0.001) {
      // set rotate anchor point to center of layer
      const cx = frame.x + frame.w/2;
      const cy = frame.y + frame.h/2;
      ctx.translate(cx, cy);
      ctx.rotate(rotate_deg * (Math.PI/180));
      ctx.translate(-cx, -cy);
    }
  }

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
      srcDrawable = imageSources.videos[node.src];

      if (!srcDrawable) fillColor = 'blue';
      break;
    }
  }

  // if rounded corners requested, use a clip path while rendering this node's content
  let inShapeClip = false;
  if (node.style && Number.isFinite(node.style.cornerRadius_px) && node.style.cornerRadius_px > 0) {
    inShapeClip = true;
    ctx.save();
    roundRect(ctx, frame.x, frame.y, frame.w, frame.h, node.style.cornerRadius_px);
    ctx.clip();
  }

  if (fillColor) {
    ctx.fillStyle = fillColor;    
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
  }

  if (srcDrawable) {
    if (isVCSDisplayListEncoder) {
      ctx.drawImage_vcsDrawable(srcDrawable, frame.x, frame.y, frame.w, frame.h);
    } else {
      ctx.drawImage(srcDrawable.domElement, frame.x, frame.y, frame.w, frame.h);
    }
  }

  if (node.text && node.text.length > 0) {
    ctx.fillStyle = node.style.textColor || 'white';

    let fontSize_px;
    if (isFinite(node.style.fontSize_vh) && node.style.fontSize_vh > 0) {
      fontSize_px = Math.round(comp.viewportSize.h * node.style.fontSize_vh);
    } else {
      fontSize_px = Math.round(node.style.fontSize_px || 24);
    }
    let fontFamily = node.style.fontFamily || 'Helvetica';
    let fontStyle = node.style.fontStyle || '';
    let fontWeight = node.style.fontWeight || '';

    if (isVCSDisplayListEncoder) {
      ctx.font = [fontWeight, fontStyle, fontSize_px, fontFamily];
    } else {
      ctx.font = `${fontWeight} ${fontStyle} ${fontSize_px}px ${fontFamily}`;
    }

    // since we don't have actual font metrics in this prototype,
    // just take a guess to position the text inside the frame
    const textY = frame.y + Math.round(fontSize_px*0.8);

    ctx.fillText(node.text, Math.round(frame.x), Math.round(textY));
  }

  if (inShapeClip) ctx.restore();

  for (const c of node.children) {
    recurseRenderNode(ctx, c, comp, imageSources);
  }

  ctx.restore();
}