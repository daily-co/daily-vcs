import { IntrinsicNodeType } from '../comp-backing-model.js';
import { roundRect } from './canvas-utils.js';

const CanvasRenderMode = {
  ALL: 'all',
  GRAPHICS_SUBTREE_ONLY: 'graphics-subtree-only',
  VIDEO_PREVIEW: 'video-preview',
};

const kVideoPreviewColors = ['#f22', '#4c4', '#34f', '#ec1', '#2ad', '#92c'];

export function renderCompInCanvas(comp, canvas, imageSources, renderAll) {
  if (!comp.rootNode) return;

  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const viewportW = comp.viewportSize.w;
  const viewportH = comp.viewportSize.h;

  const ctx = canvas.getContext('2d');

  ctx.save();

  ctx.scale(canvasW / viewportW, canvasH / viewportH);

  ctx.clearRect(0, 0, viewportW, viewportH);

  const mode = renderAll
    ? CanvasRenderMode.ALL
    : CanvasRenderMode.GRAPHICS_SUBTREE_ONLY;

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

const s_missingAssetsNotified = new Set();

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
    } else if (!isVideo && renderMode === CanvasRenderMode.VIDEO_PREVIEW) {
      writeContent = false;
    }
  }

  let frame = node.layoutFrame;

  const hasCornerRadius =
    node.style &&
    Number.isFinite(node.style.cornerRadius_px) &&
    node.style.cornerRadius_px > 0;

  let didInitialSave = false;
  if (writeContent || recurseChildren) {
    ctx.save();

    if (node.transform) {
      const { rotate_deg } = node.transform;

      if (Math.abs(rotate_deg) > 0.001) {
        // set rotate anchor point to center of layer
        const cx = frame.x + frame.w / 2;
        const cy = frame.y + frame.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(rotate_deg * (Math.PI / 180));
        ctx.translate(-cx, -cy);
      }
    }
    didInitialSave = true;
  }

  let inLayoutframeClip = false;
  if (node.clip) {
    ctx.save();
    if (hasCornerRadius) {
      roundRect(
        ctx,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        node.style.cornerRadius_px
      );
    } else {
      ctx.rect(frame.x, frame.y, frame.w, frame.h);
    }
    ctx.clip();
    inLayoutframeClip = true;
  }

  let inAlpha = false;
  if (node.blend && Number.isFinite(node.blend.opacity)) {
    ctx.save();
    ctx.globalAlpha = node.blend.opacity;
    inAlpha = true;

    // don't bother rendering content if alpha is zero
    if (node.blend.opacity <= 0) writeContent = false;
  }

  if (writeContent) {
    // encode asset references explicitly when writing a display list
    const isVCSDisplayListEncoder =
      typeof ctx.drawImage_vcsDrawable === 'function';

    let fillColor;
    let strokeColor;
    let strokeW_px;
    let srcDrawable;
    let scaleMode = node.scaleMode;
    let textContent = node.text;
    let textStyle = node.style;

    let warningOutText;

    const videoSlots = imageSources ? imageSources.videoSlots : [];
    const images = imageSources ? imageSources.assetImages : {};

    switch (node.constructor.nodeType) {
      case IntrinsicNodeType.BOX: {
        fillColor = node.style.fillColor || null;
        strokeColor = node.style.strokeColor || null;
        strokeW_px = parseFloat(node.style.strokeWidth_px);
        break;
      }
      case IntrinsicNodeType.IMAGE: {
        let placeholderFillColor = 'rgba(0, 150, 60, 0.5)';

        if (node.src && node.src.length > 0) {
          srcDrawable = images ? images[node.src] : null;
          if (!srcDrawable) {
            warningOutText = `Missing image:\n${node.src}`;
            placeholderFillColor = 'rgba(0, 50, 200, 0.5)';
            if (!s_missingAssetsNotified.has(node.src)) {
              console.error(
                'Unable to find specified source image: ',
                node.src,
                images
              );
              // to reduce log spam, only write this error once
              s_missingAssetsNotified.add(node.src);
            }
          } else if (srcDrawable.vcsSourceType === 'liveAsset') {
            srcDrawable = {
              ...srcDrawable,
              liveAssetUpdateKey: node.liveAssetUpdateKey,
            };

            // TODO: render live asset with an actual preview
            fillColor = 'white';
            textContent = `Live asset placeholder: ${srcDrawable.vcsSourceId}`;
            textStyle = { textColor: 'rgba(0, 0, 0, 0.5)' };
          }
        }
        if (!srcDrawable) fillColor = placeholderFillColor;
        break;
      }
      case IntrinsicNodeType.WEBFRAME: {
        if (
          isVCSDisplayListEncoder &&
          renderMode !== CanvasRenderMode.VIDEO_PREVIEW
        ) {
          // for command encoding, pass the magic identifier for the webframe singleton live asset
          const WEBFRAME_ASSET_MAGIC_ID = '__webframe';
          srcDrawable = images ? images[WEBFRAME_ASSET_MAGIC_ID] : null;
          if (!srcDrawable) {
            console.error(
              `Can't encode WebFrame component, asset image ${WEBFRAME_ASSET_MAGIC_ID} is missing`
            );
          } else {
            // also pass the live asset update key to ensure our sceneDesc output gets refreshed regularly
            srcDrawable = {
              ...srcDrawable,
              liveAssetUpdateKey: node.liveAssetUpdateKey,
            };
          }
        } else {
          fillColor = 'white';
          textContent = 'WebFrame: ' + node.src;
          textStyle = { textColor: 'rgba(0, 0, 0, 0.5)' };
        }
        break;
      }
      case IntrinsicNodeType.VIDEO: {
        if (renderMode === CanvasRenderMode.VIDEO_PREVIEW) {
          // in preview mode, draw a fill color and a text label.
          // these are visual aids for layout tests.
          const idx = parseInt(node.src, 10) || 0;
          fillColor = kVideoPreviewColors[idx % kVideoPreviewColors.length];
          textContent = 'Video layer preview / ' + node.src;
        } else {
          srcDrawable = videoSlots
            ? videoSlots.find((v) => v.vcsSourceId === node.src)
            : null;

          if (!srcDrawable) fillColor = 'blue';
        }
        break;
      }
    }

    // apply scaling or crop, but only if we have a drawable from where to derive the content size.
    let srcDrawableRegion;
    if (srcDrawable) {
      let contentW, contentH;
      if (srcDrawable.domElement) {
        const domEl = srcDrawable.domElement;
        if (domEl.videoWidth) {
          contentW = domEl.videoWidth;
          contentH = domEl.videoHeight;
        } else if (domEl.width) {
          contentW = domEl.width;
          contentH = domEl.height;
        }
      } else {
        // with the display list encoder, image size may be provided in the drawable descriptor
        contentW = srcDrawable.width;
        contentH = srcDrawable.height;
      }

      if (contentW > 0 && contentH > 0) {
        if (scaleMode === 'fit') {
          frame = fitToFrame(frame, contentW, contentH);
        } else if (scaleMode === 'fill') {
          srcDrawableRegion = cropToFill(frame, contentW, contentH);
        }
      }
    }

    // if rounded corners requested, use a clip path while rendering this node's content
    let inShapeClip = false;
    if (
      !inLayoutframeClip &&
      hasCornerRadius &&
      (fillColor || srcDrawable || textContent)
    ) {
      inShapeClip = true;
      ctx.save();
      roundRect(
        ctx,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        node.style.cornerRadius_px
      );
      ctx.clip();
    }

    if (fillColor) {
      ctx.fillStyle = ensureCssColor(fillColor);
      ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
    }

    if (srcDrawable) {
      // for direct drawing, pass the domElement; for encoder, the drawable descriptor
      const drawableForDrawCmd = isVCSDisplayListEncoder
        ? srcDrawable
        : srcDrawable.domElement;
      if (drawableForDrawCmd) {
        const drawCmd = isVCSDisplayListEncoder
          ? ctx.drawImage_vcsDrawable.bind(ctx)
          : ctx.drawImage.bind(ctx);

        if (srcDrawableRegion) {
          // we're cropping the input
          drawCmd(
            drawableForDrawCmd,
            srcDrawableRegion.x,
            srcDrawableRegion.y,
            srcDrawableRegion.w,
            srcDrawableRegion.h,
            frame.x,
            frame.y,
            frame.w,
            frame.h
          );
        } else {
          drawCmd(drawableForDrawCmd, frame.x, frame.y, frame.w, frame.h);
        }
      }
    }

    if (textContent && textContent.length > 0) {
      if (node.textLayoutBlocks) {
        drawStyledTextLayoutBlocks(
          ctx,
          node.textLayoutBlocks,
          textStyle,
          frame,
          comp
        );
      } else {
        drawStyledText(ctx, textContent, textStyle, frame, comp);
      }
    } else if (warningOutText && warningOutText.length > 0) {
      // print out an informational label
      const warningStyle = {
        fontSize_px: 18,
      };
      const warningFrame = { ...frame };
      warningFrame.x += 2;
      warningFrame.y += 2;
      const lines = warningOutText.split('\n');
      for (const line of lines) {
        drawStyledText(ctx, line, warningStyle, warningFrame, comp);
        warningFrame.y += 20;
      }
    }

    if (inShapeClip) ctx.restore();

    // stroke needs to be rendered after clip
    if (strokeColor && Number.isFinite(strokeW_px) && strokeW_px > 0) {
      ctx.strokeStyle = ensureCssColor(strokeColor);
      ctx.lineWidth = strokeW_px;

      if (hasCornerRadius) {
        ctx.save();
        roundRect(
          ctx,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          node.style.cornerRadius_px
        );
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
      }
    }
  } // end if (writeContent)

  if (
    recurseChildren &&
    (renderMode === CanvasRenderMode.VIDEO_PREVIEW || writeContent)
  ) {
    for (const c of node.children) {
      recurseRenderNode(ctx, renderMode, c, comp, imageSources);
    }
  }

  if (didInitialSave) {
    ctx.restore();
  }
  if (inLayoutframeClip) {
    ctx.restore();
  }
  if (inAlpha) {
    ctx.restore();
  }
}

function ensureCssColor(color) {
  if (Array.isArray(color)) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${
      color[3] !== undefined ? color[3] : 1
    })`;
  }
  return color;
}

function drawStyledTextLayoutBlocks(ctx, blocks, style, frame, comp) {
  let { x, y } = frame;

  for (const paragraphLinesArr of blocks) {
    for (const lineDesc of paragraphLinesArr) {
      const { box, string } = lineDesc;
      // the lineDesc has a 'runs' property which contains exact glyph positions.
      // for now, we just draw the string in one shot since we don't offer fancy
      // letter spacing, inline emojis, or other features that would need per-glyph rendering.

      const textFrame = {
        x: Number.isFinite(box.x) ? x + box.x : x,
        y: Number.isFinite(box.y) ? y + box.y : y,
        w: box.width,
        h: box.height,
      };
      drawStyledText(ctx, string, style, textFrame, comp);
    }
  }
}

function drawStyledText(ctx, text, style, frame, comp) {
  // when encoding a display list, prefer more easily parsed format
  const isVCSDisplayListEncoder =
    typeof ctx.drawImage_vcsDrawable === 'function';

  let color = style.textColor || 'white';
  ctx.fillStyle = ensureCssColor(color);

  let fontSize_px;
  if (isFinite(style.fontSize_gu) && style.fontSize_gu > 0) {
    fontSize_px = Math.round(comp.pixelsPerGridUnit * style.fontSize_gu);
  } else if (isFinite(style.fontSize_vh) && style.fontSize_vh > 0) {
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
  let textY = Math.round(frame.y + fontSize_px * 0.8);
  let textX = Math.round(frame.x);

  if (style.strokeColor && style.strokeWidth_px) {
    const strokeW = parseFloat(style.strokeWidth_px);
    if (Number.isFinite(strokeW) && strokeW > 0) {
      ctx.strokeStyle = ensureCssColor(style.strokeColor);
      ctx.lineWidth = strokeW;

      // round join generally looks right for text, but this should perhaps be user-controllable
      ctx.lineJoin = 'round';

      ctx.strokeText(text, textX, textY);
    }
  }

  ctx.fillText(text, textX, textY);
}

// returns the new frame
function fitToFrame(frame, contentW, contentH) {
  let boxAsp = frame.w / frame.h;
  let contentAsp = contentW / contentH;

  if (boxAsp === contentAsp) {
    return frame;
  }

  let x, y, w, h;
  if (boxAsp > contentAsp) {
    // box is wider, i.e. pillarbox
    h = frame.h;
    w = frame.h * contentAsp;
    y = frame.y;
    x = frame.x + (frame.w - w) / 2;
  } else {
    // box is taller, i.e. letterbox
    w = frame.w;
    h = frame.w / contentAsp;
    x = frame.x;
    y = frame.y + (frame.h - h) / 2;
  }

  return { x, y, w, h };
}

// returns the new content region
function cropToFill(frame, contentW, contentH) {
  let boxAsp = frame.w / frame.h;
  let contentAsp = contentW / contentH;

  let x = 0,
    y = 0,
    w = contentW,
    h = contentH;

  if (boxAsp === contentAsp) {
    // don't modify, content fits without cropping
  } else if (boxAsp > contentAsp) {
    // box is wider, crop top and bottom
    h = contentW / boxAsp;
    y += (contentH - h) / 2;
  } else {
    // box is taller, crop left and right
    w = contentH * boxAsp;
    x += (contentW - w) / 2;
  }

  return { x, y, w, h };
}
