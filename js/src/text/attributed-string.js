import {getNumericFontWeightFromCSSValue} from './font';
import Font from './font-setup';

function computeStyleAttributes(styledObj, viewport) {
  let size_px = Number.isFinite(styledObj.fontSize_px)
    ? styledObj.fontSize_px
    : 12.0;

  if (styledObj.fontSize_vh > 0) { // relative to viewport height
    size_px = styledObj.fontSize_vh * viewport.h;
  }

  // get pixel value for lineHeight
  let lineHeight_px = null;
  const lineHeight_rel = styledObj.lineHeight_rel;
  if (Number.isFinite(lineHeight_rel)) {
    lineHeight_px = lineHeight_rel * size_px;
  }

  // always render with non-fractional font size values
  // for better alignment between render targets and their different text drawing
  size_px = Math.ceil(size_px);
  if (lineHeight_px > 0) {
    lineHeight_px = Math.ceil(lineHeight_px);
  }

  let fontFamily, fontWeight, fontStyle;

  if (styledObj.fontPSName && styledObj.fontPSName.length > 0) {
    // if "fontPSName" is specified, it means the caller knows the exact
    // PostScript name for the font they want, so omit family-based lookup
    fontFamily = styledObj.fontPSName;
    fontWeight = 400;
    fontStyle = 'normal';
  } else {
    fontFamily = styledObj.fontFamily || 'Roboto';
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


export function makeAttributedStringDesc(
  string,
  styledObj,
  viewport
) {
  let fragments = [];

  const {
    size_px,
    lineHeight_px,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
  } = computeStyleAttributes(styledObj, viewport);

  /*console.log(
    "attributed text font '%s', size_px %d, weight '%s', style '%s'",
    fontFamily,
    size_px,
    fontWeight,
    fontStyle,
  );*/

  let font;
  try {
    font = Font.getFont({fontFamily, fontWeight, fontStyle});
  } catch (e) {
    console.error(
      "** couldn't get font '%s' / %s / %s, will default",
      fontFamily,
      fontWeight,
      fontStyle,
    );
    font = Font.getFont({fontFamily: 'Roboto', fontWeight: 400});
  }
  const attributes = {
    font: font.data || fontFamily,
    fontSize: size_px,
    lineHeight: lineHeight_px,
    align: textAlign,
    //paragraphSpacing: 12,  // TESTING
    //indent: 40,  // TESTING
  };

  fragments.push({
    string,
    attributes,
  });

  //fragments = embedEmojis(fragments);

  console.log("my font from %s, %s: ", fontFamily, fontWeight, font)

  return {
    fragments,
    font,
  };
}
