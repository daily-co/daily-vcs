// --- layout functions and utils ---

export function pad(parentFrame, params) {
  let { x, y, w, h } = parentFrame;
  const pad = params.pad || 0;

  x += pad;
  y += pad;
  w -= 2 * pad;
  h -= 2 * pad;

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

export function placeText(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const textSize = layoutCtx.useIntrinsicSize();

  w = textSize.w;
  h = textSize.h;

  let xOff = params.xOffset || 0;
  let yOff = params.yOffset || 0;

  switch (params.hAlign) {
    default: case 'left':
      break;

    case 'right':
      x += parentFrame.w - w;
      xOff = -xOff; // flip offset direction
      break;

    case 'center':
      x += (parentFrame.w - w) / 2;
      break;
  }

  switch (params.vAlign) {
    default: case 'top':
      break;

    case 'bottom':
      y += parentFrame.h - h;
      yOff = -yOff; // flip offset direction
      break;

    case 'center':
      y += (parentFrame.h - h) / 2;
      break;
  }

  x += xOff;
  y += yOff;
  return { x, y, w, h };
}

export function splitVertical(parentFrame, params) {
  let { index, pos = 0.5 } = params;
  let { x, y, w, h } = parentFrame;

  if (index === 0) {
    w *= pos;
  } else {
    w *= 1 - pos;
    x += parentFrame.w * pos;
  }

  return { x, y, w, h };
}

export function column(parentFrame, params, layoutCtx) {
  const { index, total } = params;
  const { viewport } = layoutCtx;
  const outputAsp = viewport.w / viewport.h;

  const outerMargin = total > 1 ? viewport.h * 0.05 : 0;
  const innerMargin = total > 1 ? viewport.h * 0.05 : 0;

  const numCols = 1;
  const numRows = total;

  // assume video item aspect ratio is same as output
  const videoAsp = outputAsp;

  return computeGridItem({
    parentFrame,
    index,
    numCols,
    numRows,
    videoAsp,
    outerMargin,
    innerMargin,
  });
}

export function grid(parentFrame, params, layoutCtx) {
  const { index, total } = params;
  const { viewport } = layoutCtx;
  const outputAsp = viewport.w / viewport.h;

  if (total < 1 || !isFinite(total)) {
    return { ...parentFrame };
  }

  const outerMargin = total > 1 ? viewport.h * 0.05 : 0;
  const innerMargin = total > 1 ? viewport.h * 0.05 : 0;

  const numCols = total > 9 ? 4 : total > 4 ? 3 : total > 1 ? 2 : 1;
  const numRows = Math.ceil(total / numCols);

  // assume video item aspect ratio is same as output
  const videoAsp = outputAsp;

  return computeGridItem({
    parentFrame,
    index,
    numCols,
    numRows,
    videoAsp,
    outerMargin,
    innerMargin,
  });
}


// -- utils --

function computeGridItem({
  parentFrame,
  index,
  numCols,
  numRows,
  videoAsp,
  outerMargin,
  innerMargin,
}) {
  const parentAsp = parentFrame.w / parentFrame.h;
  const contentAsp = (numCols * videoAsp) / numRows;

  let { x, y, w, h } = parentFrame;
  let itemW, itemH;

  // item size depends on whether our content is wider or narrower than the parent frame
  if (contentAsp >= parentAsp) {
    itemW =
      (parentFrame.w - 2 * outerMargin - (numCols - 1) * innerMargin) / numCols;
    itemH = itemW / videoAsp;

    // center grid vertically
    x += outerMargin;
    y += (parentFrame.h - (numRows * itemH + innerMargin * (numRows - 1))) / 2;
  } else {
    itemH =
      (parentFrame.h - 2 * outerMargin - (numRows - 1) * innerMargin) / numRows;
    itemW = itemH * videoAsp;

    // center grid horizontally
    y += outerMargin;
    x += (parentFrame.w - (numCols * itemW + innerMargin * (numCols - 1))) / 2;
  }

  const col = index % numCols;
  const row = Math.floor(index / numCols);

  x += col * itemW;
  x += col * innerMargin;

  y += row * itemH;
  y += row * innerMargin;

  w = itemW;
  h = itemH;

  //console.log("computing grid %d / %d, rows/cols %d, %d: ", index, total, numRows, numCols, x, y);

  return { x, y, w, h };
}
