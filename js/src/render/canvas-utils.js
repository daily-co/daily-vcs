// 'radius' can be either a number or an object specifying individual
// corner radii using properties {tl, tr, br, bl}.
export function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'undefined') {
    radius = 0;
  }
  if (typeof radius === 'number') {
    // clamp so radius doesn't exceed 50% in either dimension
    radius = Math.min(radius, 0.5 * Math.min(width, height));

    // check for special case of circle.
    // fx is fixed-point resolution for coordinate comparison.
    const fx = 4;
    const fhalfW = Math.round((width / 2) * fx) / fx;
    const fhalfH = Math.round((height / 2) * fx) / fx;
    const frad = Math.round(radius * fx) / fx;
    if (fhalfW === fhalfH && fhalfW === frad) {
      ctx.beginPath();
      ctx.ellipse(
        x + width / 2,
        y + height / 2,
        radius,
        radius,
        0,
        0,
        2 * Math.PI
      );
      return;
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
  const maxX = x + width;
  const maxY = y + height;
  ctx.beginPath();

  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(maxX - radius.tr, y);

  ctx.arcTo(maxX, y, maxX, y + radius.tr, radius.tr);

  ctx.lineTo(maxX, maxY - radius.br);

  ctx.arcTo(maxX, maxY, maxX - radius.br, maxY, radius.br);

  ctx.lineTo(x + radius.bl, maxY);

  ctx.arcTo(x, maxY, x, maxY - radius.bl, radius.bl);

  ctx.lineTo(x, y + radius.tl);

  ctx.arcTo(x, y, x + radius.tl, y, radius.tl);

  ctx.closePath();
}
