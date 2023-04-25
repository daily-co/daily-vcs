export function column(parentFrame, params, layoutCtx) {
  const {
    index,
    total,
    makeRow = false,
    itemAspectRatio = 0,
    innerMargin_gu = 0.7,
    outerMargin_gu = 0.5,
  } = params;
  const pxPerGu = layoutCtx.pixelsPerGridUnit;

  let outerMargins = { x: 0, y: 0 },
    innerMargins = { x: 0, y: 0 };
  if (total > 1) {
    innerMargins.x = innerMargins.y = innerMargin_gu * pxPerGu;
    outerMargins.x = outerMargins.y = outerMargin_gu * pxPerGu;
  }

  const numCols = makeRow ? total : 1;
  const numRows = makeRow ? 1 : total;

  // apply outer margins by insetting frame
  parentFrame = { ...parentFrame };
  parentFrame.x += outerMargins.x;
  parentFrame.y += outerMargins.y;
  parentFrame.w -= outerMargins.x * 2;
  parentFrame.h -= outerMargins.y * 2;

  const videoAsp =
    itemAspectRatio > 0
      ? itemAspectRatio
      : numRows === 1
      ? (parentFrame.w - innerMargins.x * (total - 1)) / total / parentFrame.h
      : parentFrame.w /
        ((parentFrame.h - innerMargins.y * (total - 1)) / total);

  return computeGridItem({
    parentFrame,
    index,
    numCols,
    numRows,
    videoAsp,
    innerMargins,
  });
}

export function grid(parentFrame, params, layoutCtx) {
  const pxPerGu = layoutCtx.pixelsPerGridUnit;
  const {
    index,
    total,
    innerMargin_gu = -1,
    outerMargin_gu = -1,
    preserveItemAspectRatio = true,
  } = params;
  const { viewport } = layoutCtx;
  const outputAsp = viewport.w / viewport.h;

  if (total < 1 || !isFinite(total)) {
    return { ...parentFrame };
  }

  const numCols =
    total > 16 ? 5 : total > 9 ? 4 : total > 4 ? 3 : total > 1 ? 2 : 1;
  const numRows = Math.ceil(total / numCols);

  let outerMargins = { x: 0, y: 0 },
    innerMargins = { x: 0, y: 0 };
  if (total > 1) {
    let marginRel; // a relative margin depending on aspect ratio
    if (outputAsp > 1) {
      marginRel = Math.round(viewport.h * 0.05);
    } else if (outputAsp <= 1) {
      marginRel = viewport.w * 0.04;
    }

    if (innerMargin_gu >= 0) {
      innerMargins.x = innerMargins.y = innerMargin_gu * pxPerGu;
    } else {
      innerMargins.x = innerMargins.y = marginRel;
    }

    if (outerMargin_gu >= 0) {
      outerMargins.x = outerMargins.y = outerMargin_gu * pxPerGu;
    } else {
      if (preserveItemAspectRatio) {
        if (numCols === numRows) {
          // when layout is tight, leave space in vertical margins for participant labels
          if (outputAsp > 1) {
            outerMargins.y = Math.round(marginRel * 0.7);
          } else {
            outerMargins.y = Math.round(marginRel * 1);
          }
        }
      } else {
        // when asked not to preserve item aspect ratio, don't try to guess positioning
        // - just use all available space (i.e. leave outerMargins to zero)
      }
    }
  }

  // assume video item aspect ratio is same as output
  const videoAsp = outputAsp;

  // apply outer margins by insetting frame
  parentFrame = { ...parentFrame };
  parentFrame.x += outerMargins.x;
  parentFrame.y += outerMargins.y;
  parentFrame.w -= outerMargins.x * 2;
  parentFrame.h -= outerMargins.y * 2;

  return computeGridItem({
    parentFrame,
    index,
    total,
    centerRemainder: true,
    numCols,
    numRows,
    videoAsp,
    innerMargins,
    preserveItemAspectRatio,
  });
}

// --- utils ---

function computeGridItem({
  parentFrame,
  index,
  numCols,
  numRows,
  videoAsp,
  innerMargins,
  preserveItemAspectRatio = true,
  total,
  centerRemainder = false,
}) {
  let { x, y, w, h } = parentFrame;
  let itemW, itemH;
  //: parentFrame.w / numCols / (parentFrame.h / numRows);

  if (preserveItemAspectRatio) {
    const parentAsp = parentFrame.w / parentFrame.h;
    const contentAsp = (numCols * videoAsp) / numRows;

    // item size depends on whether our content is wider or narrower than the parent frame
    if (contentAsp >= parentAsp) {
      itemW = (parentFrame.w - (numCols - 1) * innerMargins.x) / numCols;
      itemH = itemW / videoAsp;

      // center grid vertically
      y +=
        (parentFrame.h - (numRows * itemH + innerMargins.y * (numRows - 1))) /
        2;
    } else {
      itemH = (parentFrame.h - (numRows - 1) * innerMargins.y) / numRows;
      itemW = itemH * videoAsp;

      // center grid horizontally
      x +=
        (parentFrame.w - (numCols * itemW + innerMargins.x * (numCols - 1))) /
        2;
    }
  } else {
    // if we don't need to preserve the item aspect ratio,
    // the item size is simply maximum available
    itemW = (parentFrame.w - (numCols - 1) * innerMargins.x) / numCols;
    itemH = (parentFrame.h - (numRows - 1) * innerMargins.y) / numRows;
  }

  const col = index % numCols;
  const row = Math.floor(index / numCols);
  const remainder = total - numCols * (numRows - 1);

  // This is a grid, and we want the remained in the last row centered if it
  // doesn't fill all the columns
  if (
    centerRemainder &&
    row + 1 === numRows &&
    remainder > 0 &&
    remainder < numCols
  ) {
    x += ((itemW + innerMargins.x) * (numCols - remainder)) / 2;
  }

  x += col * itemW;
  x += col * innerMargins.x;

  y += row * itemH;
  y += row * innerMargins.y;

  w = itemW;
  h = itemH;

  x = Math.floor(x);
  y = Math.floor(y);
  w = Math.ceil(w);
  h = Math.ceil(h);

  //console.log("computing grid %d / %d, rows/cols %d, %d: ", index, total, numRows, numCols, x, y);

  return { x, y, w, h };
}
