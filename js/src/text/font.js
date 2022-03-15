/*
 FontSource and Font based on implementation in React-pdf.
 MIT license.
*/

import Fontkit from '@react-pdf/fontkit';
import fetch from 'cross-fetch';

const fontkit = Fontkit.default || Fontkit;

// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#Common_weight_name_mapping
const kFontWeights = {
  thin: 100,
  hairline: 100,
  ultralight: 200,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  ultrabold: 800,
  extrabold: 800,
  heavy: 900,
  black: 900,
};

export function getNumericFontWeightFromCSSValue(value) {
  if (!value) return kFontWeights.normal;
  if (typeof value === 'number') return value;
  return kFontWeights[value.toLowerCase()];
}

export const platformConfig = {
  loadFontSourceAsync: async function (fontSrc) {
    console.error(
      '** loadFontSourceAsync missing (must be overridden in font platformConfig)'
    );
  },
};

const fetchFont = async (src, options) => {
  const response = await fetch(src, options);

  const buffer = await (response.buffer
    ? response.buffer()
    : response.arrayBuffer());

  return buffer.constructor.name === 'Buffer' ? buffer : Buffer.from(buffer);
};

class FontSource {
  constructor(src, fontFamily, fontStyle, fontWeight, options) {
    this.src = src;
    this.fontFamily = fontFamily;
    this.fontStyle = fontStyle || 'normal';
    this.fontWeight = getNumericFontWeightFromCSSValue(fontWeight) || 400;

    this.data = null;
    this.loading = false;
    this.options = options;
  }

  async load() {
    this.loading = true;

    this.data = await platformConfig.loadFontSourceAsync(
      this,
      fetchFont,
      fontkit
    );

    this.loading = false;
  }
}

export class Font {
  static create(family) {
    return new Font(family);
  }

  constructor(family) {
    this.family = family;
    this.sources = [];
  }

  register({ src, fontWeight, fontStyle, ...options }) {
    this.sources.push(
      new FontSource(src, this.family, fontStyle, fontWeight, options)
    );
  }

  resolve(descriptor) {
    const { fontWeight = 400, fontStyle = 'normal' } = descriptor;
    const styleSources = this.sources.filter((s) => s.fontStyle === fontStyle);

    // Weight resolution. https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#Fallback_weights
    const exactFit = styleSources.find((s) => s.fontWeight === fontWeight);

    if (exactFit) return exactFit;

    let res;

    if (fontWeight >= 400 && fontWeight <= 500) {
      const leftOffset = styleSources.filter((s) => s.fontWeight <= fontWeight);
      const rightOffset = styleSources.filter((s) => s.fontWeight > 500);
      const fit = styleSources.filter(
        (s) => s.fontWeight >= fontWeight && s.fontWeight < 500
      );

      res = fit[0] || leftOffset[leftOffset.length - 1] || rightOffset[0];
    }

    const lt = styleSources.filter((s) => s.fontWeight < fontWeight);
    const gt = styleSources.filter((s) => s.fontWeight > fontWeight);

    if (fontWeight < 400) {
      res = lt[lt.length - 1] || gt[0];
    }

    if (fontWeight > 500) {
      res = gt[0] || lt[lt.length - 1];
    }

    if (!res) {
      throw new Error(
        `Could not resolve font for ${this.fontFamily}, fontWeight ${fontWeight}`
      );
    }

    return res;
  }
}
