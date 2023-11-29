// 'radius' can be either a number or an object specifying individual
// corner radii using properties {tl, tr, br, bl}.
export function roundRect(ctx, x, y, width, height, radius, closePath = true) {
  if (typeof radius === 'undefined') {
    radius = 0;
  }

  // there may be a direct roundRect function.
  // the VCS display list encoder has one.
  // Chrome version 99 has added CanvasRenderingContext2D.roundRect()
  // and it's also found in Firefox 112 and Safari 16.
  const hasRoundRect = typeof ctx.roundRect === 'function';

  if (typeof radius === 'number') {
    // clamp so radius doesn't exceed 50% in either dimension
    radius = Math.min(radius, 0.5 * Math.min(width, height));

    // on old-style canvas without roundRect, check for special case of circle
    if (!hasRoundRect) {
      const fx = 4; // fixed-point resolution for coordinate comparison
      const fhalfW = Math.round((width / 2) * fx) / fx;
      const fhalfH = Math.round((height / 2) * fx) / fx;
      const frad = Math.round(radius * fx) / fx;
      if (fhalfW === fhalfH && fhalfW === frad) {
        if (closePath) ctx.beginPath();
        ctx.ellipse(
          x + width / 2,
          y + height / 2,
          radius,
          radius,
          0,
          0,
          2 * Math.PI
        );
        if (closePath) ctx.closePath();
        return;
      }
    }

    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    const maxDim = 0.5 * Math.min(width, height); // clamp so radius doesn't exceed 50% in either dimension
    for (const side in defaultRadius) {
      radius[side] = radius[side]
        ? Math.min(radius[side], maxDim)
        : defaultRadius[side];
    }
  }

  if (hasRoundRect) {
    if (closePath) ctx.beginPath();

    ctx.roundRect(x, y, width, height, [
      radius.tl,
      radius.tr,
      radius.br,
      radius.bl,
    ]);

    if (closePath) ctx.closePath();
    return;
  }

  // for older canvas implementations, draw with arcs and lines
  const maxX = x + width;
  const maxY = y + height;

  if (closePath) ctx.beginPath();

  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(maxX - radius.tr, y);

  ctx.arcTo(maxX, y, maxX, y + radius.tr, radius.tr);

  ctx.lineTo(maxX, maxY - radius.br);

  ctx.arcTo(maxX, maxY, maxX - radius.br, maxY, radius.br);

  ctx.lineTo(x + radius.bl, maxY);

  ctx.arcTo(x, maxY, x, maxY - radius.bl, radius.bl);

  ctx.lineTo(x, y + radius.tl);

  ctx.arcTo(x, y, x + radius.tl, y, radius.tl);

  if (closePath) ctx.closePath();
}
