import { textSize_gu } from './constants.js';
const headerH_gu = textSize_gu * 10;

export function header(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const pxPerGu = layoutCtx.pixelsPerGridUnit;

  h = headerH_gu * pxPerGu;

  return { x, y, w, h };
}

export function body(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const pxPerGu = layoutCtx.pixelsPerGridUnit;

  const headerH_px = headerH_gu * pxPerGu;
  y += headerH_px;
  h -= headerH_px;

  return { x, y, w, h };
}
