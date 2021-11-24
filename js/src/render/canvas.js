import { IntrinsicNodeType } from "../comp-backing-model";
import { roundRect } from "./canvas-utils";

const CanvasRenderMode = {
  ALL: 'all',
  GRAPHICS_SUBTREE_ONLY: 'graphics-subtree-only',
  VIDEO_PREVIEW: 'video-preview',
};

const kVideoPreviewColors = [
  '#f22',
  '#4c4',
  '#34f',
  '#ec1',
  '#2ad',
  '#92c',
];

export function renderCompInCanvas(comp, canvas, imageSources) {
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const viewportW = comp.viewportSize.w;
  const viewportH = comp.viewportSize.h;

  const ctx = canvas.getContext('2d');

  ctx.save();

  ctx.scale(canvasW / viewportW, canvasH / viewportH);

  ctx.clearRect(0, 0, viewportW, viewportH);

  const mode = CanvasRenderMode.ALL;

  recurseRenderNode(ctx, mode, comp.rootNode, comp, imageSources);

  ctx.restore();
}

export function encodeCanvasDisplayList_fg(comp, canvasDL, imageSources) {
  const ctx = canvasDL.getContext();

  const mode = CanvasRenderMode.GRAPHICS_SUBTREE_ONLY;

  // TODO: what we really want is to get the foreground graphics only.
  // should we find the fg root here, or within the recurse.. function?
  // this function needs to be renamed too, to make it clearer which part of the tree you want.
  const root = comp.rootNode;

  recurseRenderNode(ctx, mode, root, comp, imageSources);
}

export function encodeCanvasDisplayList_videoLayersPreview(comp, canvasDL) {
  const ctx = canvasDL.getContext();
  const mode = CanvasRenderMode.VIDEO_PREVIEW;
  const root = comp.rootNode;

  recurseRenderNode(ctx, mode, root, comp, null);
}

function recurseRenderNode(ctx, renderMode, node, comp, imageSources) {
  let writeContent = true;
  let recurseChildren = true;

  if (renderMode !== CanvasRenderMode.ALL) {
    const nodeType = node.constructor.nodeType;
    const isVideo = nodeType === IntrinsicNodeType.VIDEO;
    if (isVideo && renderMode === CanvasRenderMode.GRAPHICS_SUBTREE_ONLY) {
      // don't encode video elements at all into canvas commands, they are handled separately
      writeContent = false;
      recurseChildren = false;
    }
    else if (!isVideo && renderMode === CanvasRenderMode.VIDEO_PREVIEW) {
      writeContent = false;
    }
  }

  const frame = node.layoutFrame;

  if (writeContent || recurseChildren) {
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
  }

  if (writeContent) {
    // encode asset references explicitly when writing a display list
    const isVCSDisplayListEncoder = typeof ctx.drawImage_vcsDrawable === 'function';

    let fillColor;
    let srcDrawable;
    let textContent = node.text;
    let textStyle = node.style;
  
    switch (node.constructor.nodeType) {
      case IntrinsicNodeType.BOX: {
        fillColor = node.style.fillColor || null;
        break;
      }
      case IntrinsicNodeType.IMAGE: {
        if (node.src && node.src.length > 0) {
          srcDrawable = imageSources?.images[node.src];
          if (!srcDrawable) {
            console.warn("Unable to find specified source image: ", node.src, imageSources.images);
          }
        }
        if (!srcDrawable) fillColor = 'red';
        break;
      }
      case IntrinsicNodeType.VIDEO: {
        if (renderMode === CanvasRenderMode.VIDEO_PREVIEW) {
          // in preview mode, draw a fill color and a text label.
          // these are visual aids for layout tests.
          const idx = parseInt(node.src, 10) || 0;
          fillColor = kVideoPreviewColors[idx % kVideoPreviewColors.length];
          textContent = 'Video layer preview / ' + node.src;
        }
        else {
          srcDrawable = imageSources?.videos[node.src];
  
          if (!srcDrawable) fillColor = 'blue';  
        }
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
  
    if (textContent && textContent.length > 0) {
      drawStyledText(ctx, textContent, textStyle, frame, comp);
    }
  
    if (inShapeClip) ctx.restore();  
  } // end if (writeContent)

  if (recurseChildren) {
    for (const c of node.children) {
      recurseRenderNode(ctx, renderMode, c, comp, imageSources);
    }  
  }

  if (writeContent || recurseChildren) {
    ctx.restore();
  }
}

function drawStyledText(ctx, text, style, frame, comp) {
  // when encoding a display list, prefer more easily parsed format
  const isVCSDisplayListEncoder = typeof ctx.drawImage_vcsDrawable === 'function';

  ctx.fillStyle = style.textColor || 'white';
  
  let fontSize_px;
  if (isFinite(style.fontSize_vh) && style.fontSize_vh > 0) {
    fontSize_px = Math.round(comp.viewportSize.h * style.fontSize_vh);
  } else {
    fontSize_px = Math.round(style.fontSize_px || 24);
  }
  let fontFamily = style.fontFamily || 'Roboto';
  let fontStyle = style.fontStyle || '';
  let fontWeight = style.fontWeight || '';

  if (isVCSDisplayListEncoder) {
    ctx.font = [fontWeight, fontStyle, fontSize_px, fontFamily];
  } else {
    ctx.font = `${fontWeight} ${fontStyle} ${fontSize_px}px ${fontFamily}`;
  }

  // since we don't have access to actual font metrics yet,
  // just take a guess to position the text baseline properly
  const textY = frame.y + Math.round(fontSize_px*0.8);

  ctx.fillText(text, Math.round(frame.x), Math.round(textY));
}