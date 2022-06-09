import { getNumericFontWeightFromCSSValue } from './font.js';
import fontSetup from './font-setup.js';

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
  color = Array.isArray(styledObj.color) ? styledObj.color : [];
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
export function makeAttributedStringDesc(string, styledObj, viewport, pxPerGu) {
  let fragments = [];

  const {
    size_px,
    lineHeight_px,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
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
  };
  /*
  other attributes available include:
    - paragraphSpacing
    - indent
  */

  fragments.push({
    string,
    attributes,
  });

  // TODO: emoji replacement should be handled here

  return {
    fragments,
    font,
  };
}
