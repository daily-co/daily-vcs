import { IntrinsicNodeType } from '../comp-backing-model.js';
import { roundRect } from './canvas-utils.js';
import { encodeCompVideoSceneDesc } from './video-scenedesc.js';

const CanvasRenderMode = {
  ALL: 'all',
  GRAPHICS_SUBTREE_ONLY: 'graphics-subtree-only',
  BG_GRAPHICS_SUBTREE_ONLY: 'bg-graphics-subtree-only',
  VIDEO_PREVIEW: 'video-preview',
};

const kVideoPreviewColors = ['#f22', '#4c4', '#34f', '#ec1', '#2ad', '#92c'];

const kNotoEmojiBaseline = 0.83;

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

  if (renderAll) {
    recurseRenderNode(
      ctx,
      CanvasRenderMode.ALL,
      comp.rootNode,
      comp,
      imageSources
    );
  } else {
    // background clipped by video layers
    let videoLayers = encodeCompVideoSceneDesc(comp, imageSources);
    let continueAtNode = null;
    if (videoLayers.length > 0) {
      continueAtNode = recurseBackground(ctx, comp, imageSources, videoLayers);
    }

    // foreground
    recurseRenderNode(
      ctx,
      CanvasRenderMode.GRAPHICS_SUBTREE_ONLY,
      comp.rootNode,
      comp,
      imageSources,
      { continueAtNode }
    );
  }

  ctx.restore();
}

export function encodeCanvasDisplayList_fg(comp, canvasDL, imageSources) {
  const ctx = canvasDL.getContext();

  recurseRenderNode(
    ctx,
    CanvasRenderMode.GRAPHICS_SUBTREE_ONLY,
    comp.rootNode,
    comp,
    imageSources
  );
}

export function encodeCanvasDisplayList_fg_vlClip(
  comp,
  canvasDL,
  imageSources,
  videoLayers
) {
  const ctx = canvasDL.getContext();

  // background clipped by video layers
  let continueAtNode = null;
  if (videoLayers.length > 0) {
    continueAtNode = recurseBackground(ctx, comp, imageSources, videoLayers);
  }

  // foreground
  recurseRenderNode(
    ctx,
    CanvasRenderMode.GRAPHICS_SUBTREE_ONLY,
    comp.rootNode,
    comp,
    imageSources,
    { continueAtNode }
  );
}

function recurseBackground(ctx, comp, imageSources, videoLayers) {
  // build clipping mask from video layers
  ctx.save();
  ctx.beginPath();

  // start with a base rectangle into which we punch holes for videos
  ctx.rect(0, 0, comp.viewportSize.w, comp.viewportSize.h);

  for (const vl of videoLayers) {
    const { frame, attrs } = vl;
    const { cornerRadiusPx = 0 } = attrs;
    if (cornerRadiusPx > 0.5) {
      roundRect(ctx, frame.x, frame.y, frame.w, frame.h, cornerRadiusPx, false);
    } else {
      ctx.rect(frame.x, frame.y, frame.w, frame.h);
    }
  }
  // use even-odd filling rule to render the holes
  ctx.clip('evenodd');

  function bgDoneCb(recState, node) {
    function recurseToTopLevelParent(n) {
      const p = n.parent;
      if (!p) return n;
      if (p.constructor.nodeType === IntrinsicNodeType.ROOT) return n;

      // check for typical construction where root has a single child
      if (
        p.parent?.constructor.nodeType === IntrinsicNodeType.ROOT &&
        p.parent.children.length === 1
      )
        return n;

      return recurseToTopLevelParent(p);
    }
    recState.done = true;
    recState.continueAtNode = recurseToTopLevelParent(node);
  }

  const mode = CanvasRenderMode.BG_GRAPHICS_SUBTREE_ONLY;
  const root = comp.rootNode;
  const recState = { bgDoneCb };

  recurseRenderNode(ctx, mode, root, comp, imageSources, recState);

  ctx.restore(); // end clip

  // this is returned as a hint for rendering the foreground.
  // we ended the background at this top-level node, so the render pass
  // for foreground elements can continue here
  return recState.continueAtNode;
}

export function encodeCanvasDisplayList_videoLayersPreview(comp, canvasDL) {
  const ctx = canvasDL.getContext();
  const mode = CanvasRenderMode.VIDEO_PREVIEW;
  const root = comp.rootNode;

  recurseRenderNode(ctx, mode, root, comp, null);
}

const s_missingAssetsNotified = new Set();

function recurseRenderNode(
  ctx,
  renderMode,
  node,
  comp,
  imageSources,
  recState
) {
  let writeContent = true;
  let recurseChildren = true;

  if (renderMode !== CanvasRenderMode.ALL) {
    const nodeType = node.constructor.nodeType;
    const isVideo = nodeType === IntrinsicNodeType.VIDEO;

    if (isVideo && renderMode === CanvasRenderMode.BG_GRAPHICS_SUBTREE_ONLY) {
      // when rendering the background, end bg clipping at first video layer
      recState.bgDoneCb(recState, node);
      return;
    } else if (
      isVideo &&
      renderMode === CanvasRenderMode.GRAPHICS_SUBTREE_ONLY
    ) {
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
      let { rotate_deg = 0, scaleX = 1, scaleY = 1 } = node.transform;

      if (Number.isFinite(node.transform.scale)) {
        scaleX *= node.transform.scale;
        scaleY *= node.transform.scale;
      }

      const hasRot = Math.abs(rotate_deg) > 0.001;
      const hasScale = scaleX !== 1 || scaleY !== 1;

      if (hasRot || hasScale) {
        // set anchor point to center of layer
        const cx = frame.x + frame.w / 2;
        const cy = frame.y + frame.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(rotate_deg * (Math.PI / 180));
        ctx.scale(scaleX, scaleY);
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
      ctx.beginPath();
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
          let canDrawWebFrame = true;

          if (node.viewportSizeLastUpdateTs > 0) {
            const tSinceUpdate =
              Date.now() / 1000 - node.viewportSizeLastUpdateTs;
            if (tSinceUpdate < 0.2) {
              // if the viewport size was just changed, don't render.
              // this prevents a flash of mis-shaped content on the server.
              canDrawWebFrame = false;
            }
          }

          if (canDrawWebFrame) {
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
          }
        } else {
          // draw a non-live preview of the webframe
          fillColor = 'white';
          textContent =
            'WebFrame: ' + (node.src?.length > 0 ? node.src : '[no URL]');
          textStyle = { textColor: 'rgba(0, 0, 0, 0.5)' };

          if (node.keyPressActionLastUpdateTs > 0) {
            const tSinceKeypress =
              Date.now() / 1000 - node.keyPressActionLastUpdateTs;
            if (
              tSinceKeypress < 1 &&
              node.keyPressAction.name &&
              node.keyPressAction.name.length > 0
            ) {
              textContent = 'Key pressed: ' + node.keyPressAction.name;
            }
          }
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
      const { fontMetrics } = node.attrStringDesc || {};

      if (node.textLayoutBlocks) {
        drawStyledTextLayoutBlocks(
          ctx,
          node.textLayoutBlocks,
          fontMetrics,
          textStyle,
          frame,
          comp
        );
      } else {
        drawStyledText(ctx, textContent, fontMetrics, textStyle, frame, comp);
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

    if (node.emoji && node.emoji.length > 0) {
      let { x, y, w, h } = frame;
      y += h * kNotoEmojiBaseline;
      drawEmoji(ctx, node.emoji, x, y, w, h, false);
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
    let children = node.children;

    if (recState?.continueAtNode && node === recState.continueAtNode.parent) {
      // filter children so we omit top-level nodes that were already rendered in bg
      children = [];
      let found = false;
      for (const c of node.children) {
        if (c === recState.continueAtNode) found = true;
        if (found) children.push(c);
      }
    }

    for (const c of children) {
      recurseRenderNode(ctx, renderMode, c, comp, imageSources, recState);

      if (recState?.done) break;
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

function drawStyledTextLayoutBlocks(
  ctx,
  blocks,
  fontMetrics,
  style,
  frame,
  comp
) {
  let { x, y } = frame;

  for (const paragraphLinesArr of blocks) {
    for (const lineDesc of paragraphLinesArr) {
      const { box, string, runs } = lineDesc;
      const textBaseX = Number.isFinite(box.x) ? x + box.x : x;
      const textBaseY = Number.isFinite(box.y) ? y + box.y : y;
      let xoff = 0;

      for (const run of runs) {
        const chunk = string.slice(run.start, run.end);

        const textFrame = {
          x: textBaseX + xoff,
          y: textBaseY,
          w: box.width,
          h: box.height,
        };

        // unicode object substitution indicates emojis.
        // we assume it's at position 0 because embedEmojis() creates such runs
        if (chunk.indexOf(String.fromCharCode(0xfffc)) === 0) {
          const attrs = run.attributes;
          const emoji = attrs?.attachment?.emoji;
          if (!emoji) {
            console.warn(
              'No emoji attachment found for text run marked as such, attrs: ',
              attrs
            );
          } else {
            const { width = 0, height = 0, yOffset = 0 } = attrs.attachment;
            drawEmoji(
              ctx,
              emoji,
              Math.round(textFrame.x),
              Math.round(textFrame.y + yOffset + (fontMetrics?.baseline || 0)),
              width,
              height
            );
          }
        } else {
          drawStyledText(ctx, chunk, fontMetrics, style, textFrame, comp);
        }

        //console.log('run %s - ', chunk, run);

        for (const glyphPos of run.positions) {
          xoff += glyphPos.xAdvance;
        }
      }
    }
  }
}

function drawEmoji(ctx, emoji, x, y, w, h, isInline = true) {
  const isVCSDisplayListEncoder =
    typeof ctx.drawImage_vcsDrawable === 'function';

  if (isVCSDisplayListEncoder) {
    // apply a scale factor to make the NotoColorEmoji font used by the destination renderer
    // better match the browser's inline emoji rendering.
    // the display offset lines up the emoji closer to the typical baseline.
    // maybe these should be computed using the surrounding font's baseline? not sure
    const emojiDisplayScale = kNotoEmojiBaseline;
    const emojiDisplayYOff = -0.1 * h;
    ctx.fillStyle = 'white';
    ctx.fillText_emoji(
      emoji,
      x,
      Math.round(y + emojiDisplayYOff),
      Math.round(w * emojiDisplayScale),
      Math.round(h * emojiDisplayScale)
    );
  } else {
    // in the browser, set font to monospace and let font replacement insert the emoji.
    // this works in Mac browsers, at least.
    // alternatively we could load NotoColorEmoji explicitly in `lib-browser/font-loader.js`
    // and specify that font name here - but it's a large font to load every time, so disabled for now.
    const emojiDisplayScale = 1;
    ctx.font = `${h * emojiDisplayScale}px monospace`;
    ctx.fillText(emoji, x, y);
  }
}

function drawStyledText(ctx, text, fontMetrics, style, frame, comp) {
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

  let fontBaseline = fontMetrics?.baseline;
  if (fontBaseline == null) {
    fontBaseline = fontSize_px * 0.8;
  }

  let textY = Math.round(frame.y + fontBaseline);
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
