import { getNumericFontWeightFromCSSValue } from './font.js';
import fontSetup from './font-setup.js';
import { embedEmojis } from './emoji.js';

const kFallbackFont = fontSetup.fallbackFontFamily;

function computeStyleAttributes(styledObj, viewport, pxPerGu) {
  let size_px = Number.isFinite(styledObj.fontSize_px)
    ? styledObj.fontSize_px
    : 12.0;

  if (styledObj.fontSize_gu > 0) {
    // in grid units
    size_px = styledObj.fontSize_gu * pxPerGu;
  } else if (styledObj.fontSize_vh > 0) {
    // relative to viewport height
    size_px = styledObj.fontSize_vh * viewport.h;
  }

  // get pixel value for lineHeight
  let lineHeight_px = null;
  const lineHeight_rel = styledObj.lineHeight_rel;
  if (Number.isFinite(lineHeight_rel)) {
    lineHeight_px = lineHeight_rel * size_px;
  }

  // always render with non-fractional font size values for better alignment
  // between render targets and their different text drawing.
  size_px = Math.ceil(size_px);
  if (lineHeight_px > 0) {
    lineHeight_px = Math.ceil(lineHeight_px);
  }

  let fontFamily, fontWeight, fontStyle;

  if (styledObj.fontPSName && styledObj.fontPSName.length > 0) {
    // if "fontPSName" is specified, it means the caller knows the exact
    // PostScript name for the font they want, so omit family-based lookup.
    fontFamily = styledObj.fontPSName;
    fontWeight = 400;
    fontStyle = 'normal';
  } else {
    fontFamily = styledObj.fontFamily || kFallbackFont;
    fontStyle = styledObj.fontStyle || 'normal';

    fontWeight = parseFloat(styledObj.fontWeight);
    if (!isFinite(fontWeight)) {
      fontWeight = styledObj.fontWeight
        ? getNumericFontWeightFromCSSValue(styledObj.fontWeight)
        : 400;
    }
  }

  let textAlign = styledObj.textAlign || 'left';

  let color, opacity, shadow;
  color = styledObj.textColor;
  opacity = styledObj.opacity;
  shadow = styledObj.shadow || {};

  return {
    size_px,
    lineHeight_px,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
    color,
    opacity,
    shadow,
  };
}

// returned 'fragments' array is the pieces needed to construct a Fontkit AttributedString object.
// we're returning also the font object, since our attributed strings are currently single-style
// (no inline fonts in fragments, yet).
export function makeAttributedStringDesc(spans, styledObj, viewport, pxPerGu) {
  let fragments = [];

  const {
    size_px,
    lineHeight_px,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
    color,
  } = computeStyleAttributes(styledObj, viewport, pxPerGu);

  let font;
  try {
    font = fontSetup.getFont({ fontFamily, fontWeight, fontStyle });
  } catch (e) {
    console.error(
      "** couldn't get font '%s' / %s / %s, will default",
      fontFamily,
      fontWeight,
      fontStyle
    );
    font = fontSetup.getFont({ fontFamily: kFallbackFont, fontWeight: 400 });
    if (!font) {
      console.assert(
        `Fallback font ${kFallbackFont} is not available, engine is misconfigured`
      );
    }
  }
  const attributes = {
    font: font.data, // textkit expects the data in the 'font' property
    fontSize: size_px,
    lineHeight: lineHeight_px,
    align: textAlign,
    color,
  };
  /*
  other attributes available include:
    - paragraphSpacing
    - indent
  */

  for (const span of spans) {
    const { string, style: overrideStyle } = span;
    let spanAttrs = attributes;
    if (overrideStyle) {
      const overrideAttrs = computeStyleAttributes(
        { ...styledObj, ...overrideStyle },
        viewport,
        pxPerGu
      );
      spanAttrs = { ...attributes };
      if (overrideAttrs.color) spanAttrs.color = overrideAttrs.color;
      if (overrideAttrs.size_px) spanAttrs.fontSize = overrideAttrs.size_px;
      // TODO: add more supported attributes
    }
    fragments.push({
      string,
      attributes: spanAttrs,
    });
  }

  fragments = embedEmojis(fragments);

  return {
    fragments,
    font,
    textAlign,
    fontSize_px: size_px,
    fontMetrics: calculateBaseline(font.data, size_px),
  };
}

function calculateBaseline(font, fontSize) {
  if (!font) {
    console.warn('** calculateBaseline: no font data provided');
    return {
      baseline: fontSize * 0.85, // return a guess
    };
  }
  const os2Table = font['OS/2'];
  const hheaTable = font.hhea;
  if (!os2Table || !hheaTable) {
    // these tables shouldn't be missing from any real-world TTF/OTF font,
    // but just in case, take a guess if we don't have the values
    return {
      baseline: fontSize * 0.8,
    };
  }

  const upm = font.head.unitsPerEm;

  const ascender = hheaTable.ascent; // this value seems more correct than 'os2Table.typoAscender'
  //const descender = os2Table.typoDescender;

  const capHeight = Number.isFinite(os2Table.capHeight)
    ? os2Table.capHeight
    : ascender * 0.8; // some old fonts may not have this value, so take a guess if we must

  const lineGap = hheaTable.lineGap || 0;

  const scale = fontSize / upm;
  let baseline = (upm - ascender + capHeight + lineGap) * scale;

  return {
    baseline,
  };
}
