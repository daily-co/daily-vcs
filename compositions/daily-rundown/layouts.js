import { pad, splitHorizontal, splitVertical } from '#vcs-stdlib/layouts';

export { pad, splitHorizontal, splitVertical };

export function splitVerticalMultiWay(parentFrame, params, layoutCtx) {
  const { index, splitPositions } = params;
  let { x, y, w, h } = parentFrame;

  if (!Array.isArray(splitPositions) || splitPositions.length < 1) {
    // if the user hasn't specified split positions, bail
    return { ...parentFrame };
  }
  const numSplits = splitPositions.length;
  if (index < 0 || index > numSplits) {
    // index out of bounds, so bail with zero frame
    w = 0;
    return { x, y, w, h };
  }

  let lpos = index > 0 ? splitPositions[index - 1] : 0;
  let rpos = index < numSplits ? splitPositions[index] : 1;

  x += lpos * parentFrame.w;
  w = (rpos - lpos) * parentFrame.w;

  return { x, y, w, h };
}

export function rundownPortraitSplitThreeWay(parentFrame, params, layoutCtx) {
  const { index, splitPositions } = params;
  let { x, y, w, h } = parentFrame;

  if (!Array.isArray(splitPositions) || splitPositions.length < 1) {
    // if the user hasn't specified split positions, bail
    return { ...parentFrame };
  }

  const topSplitFrame = splitHorizontal(
    parentFrame,
    { index: index === 1 ? 0 : 1 },
    layoutCtx
  );
  if (index === 1) {
    return topSplitFrame;
  }

  const bottomSplitFrame = splitVertical(
    topSplitFrame,
    { index: index > 1 ? 1 : 0 },
    layoutCtx
  );
  return bottomSplitFrame;
}

export function rundownPortraitAdaptiveSplit(parentFrame, params, layoutCtx) {
  const { viewport } = layoutCtx;
  const asp = viewport.w / viewport.h;

  return asp > 1
    ? splitVerticalMultiWay(parentFrame, params, layoutCtx)
    : rundownPortraitSplitThreeWay(parentFrame, params, layoutCtx);
}

export function stackFixedRows(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  let { index, numItems, padding_gu = 0.5, offsetY_gu = 0 } = params;
  let { x, y, w, h } = parentFrame;
  const padding_px = padding_gu * pxPerGu;

  x += padding_px;
  y += padding_px;

  const availableH = parentFrame.h - padding_px * (1 + numItems);

  h = availableH / numItems;

  y += index * (h + padding_px);
  y += offsetY_gu * pxPerGu;

  w -= padding_px * 2;

  return { x, y, w, h };
}

export function rundownHeadItem(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  let { offsetX_gu = 0, offsetY_gu = 0 } = params;

  let { x, y, w, h } = pad(parentFrame, params, layoutCtx);

  x += offsetX_gu * pxPerGu;
  y += offsetY_gu * pxPerGu;

  return { x, y, w, h };
}

export function itemText(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  const viewport = layoutCtx.viewport;
  const textSize = layoutCtx.useIntrinsicSize();
  const { fontSize_gu = 1 } = params;
  let { x, y, w, h } = parentFrame;

  const fontSize_px = fontSize_gu * pxPerGu;

  // if this is a single line of text, add some margin at top,
  // but only if we have enough height available
  if (textSize.w < w && h > fontSize_px * 2) {
    y += fontSize_px;
  }

  return { x, y, w, h };
}

export function centerText(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  const textSize = layoutCtx.useIntrinsicSize();
  const { offsetY_gu = 0 } = params;
  let { x, y, w, h } = parentFrame;

  y += (parentFrame.h - textSize.h) / 2;

  y += offsetY_gu * pxPerGu;

  return { x, y, w, h };
}

export function positionParticipantLabel(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  let { x, y, w, h } = parentFrame;

  x += pxPerGu;
  y += pxPerGu;

  return { x, y, w, h };
}

export function horizontalBar(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  const { proportionalSize = 0, maxH_gu = 0 } = params;
  let { x, y, w, h } = parentFrame;

  w *= proportionalSize;

  if (maxH_gu > 0) {
    const maxH = maxH_gu * pxPerGu;
    if (h > maxH) {
      h = maxH;
      y += (parentFrame.h - h) / 2;
    }
  }

  return { x, y, w, h };
}
