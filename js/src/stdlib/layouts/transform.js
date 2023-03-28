export function pad(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;

  let padL = 0,
    padR = 0,
    padT = 0,
    padB = 0;

  // padding can be specified as either a value or an object with l/r/t/b
  if (Number.isFinite(params.pad)) {
    padL = padR = padT = padB = params.pad;
  } else if (Number.isFinite(params.pad_gu)) {
    const pxPerGu = layoutCtx.pixelsPerGridUnit;
    padL = padR = padT = padB = params.pad_gu * pxPerGu;
  } else if (typeof params.pad_gu === 'object') {
    const pxPerGu = layoutCtx.pixelsPerGridUnit;
    let { l, r, t, b } = params.pad_gu;

    if (Number.isFinite(l)) padL = l * pxPerGu;
    if (Number.isFinite(r)) padR = r * pxPerGu;
    if (Number.isFinite(t)) padT = t * pxPerGu;
    if (Number.isFinite(b)) padB = b * pxPerGu;
  } else if (typeof params.pad_viewportRelative === 'object') {
    const { viewport } = layoutCtx;
    let { l, r, t, b } = params.pad_viewportRelative;

    if (Number.isFinite(l)) padL = l * viewport.w;
    if (Number.isFinite(r)) padR = r * viewport.w;
    if (Number.isFinite(t)) padT = t * viewport.h;
    if (Number.isFinite(b)) padB = b * viewport.h;
  }

  x += padL;
  y += padT;
  w -= padL + padR;
  h -= padT + padB;

  return { x, y, w, h };
}

export function offset(parentFrame, params) {
  let { x, y, w, h } = parentFrame;

  x += params.x || 0;
  y += params.y || 0;

  return { x, y, w, h };
}

export function fit(parentFrame, params) {
  let contentAsp = params.contentAspectRatio;
  if (!Number.isFinite(contentAsp)) {
    // we can't fit without knowing the aspect ratio
    return { ...parentFrame };
  }

  let { x, y, w, h } = parentFrame;
  const parentAsp = w / h;

  if (contentAsp >= parentAsp) {
    // content is wider than frame
    h = w / contentAsp;

    y += (parentFrame.h - h) / 2;
  } else {
    // content is narrower than frame
    w = h * contentAsp;

    x += (parentFrame.w - w) / 2;
  }

  return { x, y, w, h };
}
