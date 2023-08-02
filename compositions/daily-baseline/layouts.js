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
  const { viewport, pixelsPerGridUnit: pxPerGu } = layoutCtx;
  const asp = viewport.w / viewport.h;
  let { x, y, w, h } = parentFrame;

  let defaultW_prop = 0.65;
  if (params.maxWidth_pct) {
    if (asp >= 1 && params.maxWidth_pct.default) {
      defaultW_prop = params.maxWidth_pct.default / 100;
    } else if (asp < 1 && params.maxWidth_pct.portrait) {
      defaultW_prop = params.maxWidth_pct.portrait / 100;
    }
  }

  const margin = pxPerGu; // always leave this much margin around the box
  const defaultW = Math.round(parentFrame.w * defaultW_prop);
  const defaultH = viewport.h - parentFrame.y - margin * 2;

  const contentSize = layoutCtx.useContentSize();

  w = contentSize.w > 0 ? contentSize.w : defaultW;
  h = contentSize.h > 0 ? contentSize.h : defaultH;

  x += parentFrame.w - w - margin;
  y += margin;

  return { x, y, w, h };
}

export function toastIcon(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  const { size_gu = 5 } = params;
  let { x, y, w, h } = parentFrame;

  const dim = size_gu * pxPerGu;
  w = h = dim;

  return { x, y, w, h };
}

export function centerYIfNeeded(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  const { minH_gu = 1 } = params;
  let { x, y, w, h } = parentFrame;

  const minH = minH_gu * pxPerGu;

  const contentSize = layoutCtx.useContentSize();
  if (contentSize.h > 0 && contentSize.h < minH) {
    // center vertically
    h = contentSize.h;
    y += (parentFrame.h - h) / 2;
  }

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
