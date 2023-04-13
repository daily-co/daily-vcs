import { PositionCorner } from './constants.js';

import {
  pad,
  offset,
  fit,
  splitHorizontal,
  splitVertical,
  splitAcrossLongerDimension,
  column,
  grid,
} from '#vcs-stdlib/layouts';

// --- layout functions and utils ---

export {
  pad,
  offset,
  fit,
  splitHorizontal,
  splitVertical,
  splitAcrossLongerDimension,
  column,
  grid,
};

export function placeText(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const textSize = layoutCtx.useIntrinsicSize();
  const pxPerGu = layoutCtx.pixelsPerGridUnit;

  w = textSize.w;
  h = textSize.h;

  let xOff = params.xOffset_gu || 0;
  let yOff = params.yOffset_gu || 0;
  xOff *= pxPerGu;
  yOff *= pxPerGu;

  switch (params.vAlign) {
    default:
    case 'top':
      break;

    case 'bottom':
      y += parentFrame.h - h;
      yOff = -yOff; // flip offset direction
      break;

    case 'center':
      y += (parentFrame.h - h) / 2;
      break;
  }

  switch (params.hAlign) {
    case 'center':
    case 'right':
      w = parentFrame.w; // the text overlay is parent-sized if not default alignment
      break;
  }

  x += xOff;
  y += yOff;
  return { x, y, w, h };
}

export function gridLabel(parentFrame, params) {
  const { textH = 0, offsets = {} } = params;
  let { x, y, w, h } = parentFrame;

  y += h + Math.round(textH * 0.1);

  if (Number.isFinite(offsets.x)) x += offsets.x;
  if (Number.isFinite(offsets.y)) y += offsets.y;

  return { x, y, w, h };
}

export function pip(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const {
    positionCorner = PositionCorner.TOP_LEFT,
    aspectRatio = 1,
    height_gu = 0.2,
    margin_gu = 0,
  } = params;
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  const margin = margin_gu * pxPerGu;

  h = Math.round(height_gu * pxPerGu);
  w = Math.round(aspectRatio * h);

  if (
    positionCorner === PositionCorner.TOP_LEFT ||
    positionCorner === PositionCorner.TOP_RIGHT
  ) {
    y += margin;
  } else {
    y += parentFrame.h - h - margin;
  }

  if (
    positionCorner === PositionCorner.TOP_LEFT ||
    positionCorner === PositionCorner.BOTTOM_LEFT
  ) {
    x += margin;
  } else {
    x += parentFrame.w - w - margin;
  }

  return { x, y, w, h };
}

export function pausedPlaceholderIcon(parentFrame) {
  let { x, y, w, h } = parentFrame;
  w = h = 32;
  x += (parentFrame.w - w) / 2;
  y += (parentFrame.h - h) / 2;
  return { x, y, w, h };
}

export function toast(parentFrame, params, layoutCtx) {
  const lineH = getLineH(params, layoutCtx);
  let { x, y, w, h } = parentFrame;

  const { textLength = 20, maxLinesOfText = 2 } = params;
  const { viewport } = layoutCtx;
  const asp = viewport.w / viewport.h;

  let relW;
  if (asp > 1) {
    // very basic adaptation to text length.
    // this will be replaced with real text measurement when two-pass layout is available.
    relW = textLength > 32 ? 0.7 : textLength > 16 ? 0.45 : 0.33;
  } else {
    relW = asp < 0.8 ? 0.9 : 0.8;
  }

  w = Math.round(parentFrame.w * relW);
  h = lineH * (2 + Math.max(maxLinesOfText, 1));

  const margin = lineH * 1;

  x += parentFrame.w - w - margin;
  y += margin;

  const pad = lineH * 0.5;

  return { x, y, w, h, pad };
}

export function toastIcon(parentFrame, params) {
  let { x, y, w, h } = parentFrame;

  const iconSize = h;
  w = iconSize;

  const lMargin = 8;
  x += lMargin;

  return { x, y, w, h };
}

export function toastText(parentFrame, params, layoutCtx) {
  const lineH = getLineH(params, layoutCtx);
  const { actualLinesOfText = 1, showIcon = true } = params;
  let { x, y, w, h } = parentFrame;

  if (showIcon) {
    const iconSize = h;
    const iconMargin = 20;
    x += iconSize + iconMargin;
    w -= iconSize + iconMargin;
  }

  // add default margin
  const lMargin = 8;
  x += lMargin;
  w -= lMargin;

  const textH = Math.max(actualLinesOfText, 1) * lineH;
  y += (parentFrame.h - textH) / 2;

  return { x, y, w, h };
}

// -- utils --

function getLineH(params, layoutCtx) {
  if (isFinite(params.fontSize_px)) {
    return params.fontSize_px;
  }
  const { viewport, pixelsPerGridUnit } = layoutCtx;
  if (isFinite(params.fontSize_gu)) {
    return params.fontSize_gu * pixelsPerGridUnit;
  }
  const { fontSize_vh = 0.05 } = params;
  return fontSize_vh * viewport.h;
}
