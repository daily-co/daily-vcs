export function splitVertical(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  let { index, pos = 0.5, margin_gu = 0 } = params;
  let { x, y, w, h } = parentFrame;

  const margin_px = margin_gu * pxPerGu;
  const availableW = parentFrame.w - margin_px;

  if (index === 0) {
    w = availableW * pos;
  } else {
    w = availableW * (1 - pos);
    x += availableW * pos + margin_px;
  }

  return { x, y, w, h };
}

export function splitHorizontal(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  let { index, pos = 0.5, margin_gu = 0 } = params;
  let { x, y, w, h } = parentFrame;

  const margin_px = margin_gu * pxPerGu;
  const availableH = parentFrame.h - margin_px;

  if (index === 0) {
    h = availableH * pos;
  } else {
    h = availableH * (1 - pos);
    y += availableH * pos + margin_px;
  }

  return { x, y, w, h };
}

export function splitAcrossLongerDimension(parentFrame, params, layoutCtx) {
  const { viewport } = layoutCtx;
  const asp = viewport.w / viewport.h;
  if (asp >= 1) {
    return splitVertical(parentFrame, params, layoutCtx);
  } else {
    return splitHorizontal(parentFrame, params, layoutCtx);
  }
}
