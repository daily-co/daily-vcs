/*
 Modified from React-pdf.
 MIT license
*/

import {Font, platformConfig} from './font.js';

// we have no assumption of standard platform fonts
// because servers may not have anything set up.
// every font must be explicitly loaded.
const kStandardFonts = [];

let g_fonts = {};

let hyphenationCallback = (word) => {
  // default: disable hyphenation (just return entire words)
  return [word];
}

const registerHyphenationCallback = fn => {
  hyphenationCallback = fn;
};

const getHyphenationCallback = () => {
  return hyphenationCallback;
}

const register = (src, data) => {
  if (typeof src === 'object') {
    data = src;
  } else {
    console.error(
      false,
      'Font.register will not longer accept the font source as first argument. ' +
        'Please move it into the data object. ' +
        'For more info refer to https://react-pdf.org/fonts',
    );

    data.src = src;
  }

  const {family} = data;

  if (!g_fonts[family]) {
    g_fonts[family] = Font.create(family);
  }

  // Bulk loading
  if (data.fonts) {
    for (let i = 0; i < data.fonts.length; i++) {
      g_fonts[family].register({family, ...data.fonts[i]});
    }
  } else {
    g_fonts[family].register(data);
  }
};

const getRegisteredFonts = () => g_fonts;

const getRegisteredFontFamilies = () => Object.keys(g_fonts);

const getFont = descriptor => {
  const {fontFamily} = descriptor;
  const isStandard = kStandardFonts.includes(fontFamily);

  if (isStandard) return null;

  if (!g_fonts[fontFamily]) {
    throw new Error(
      `Font family not registered: ${fontFamily}. ` +
        `Please register it calling Font.register() method.`,
    );
  }

  return g_fonts[fontFamily].resolve(descriptor);
};

const load = async function(descriptor, doc) {
  const {fontFamily} = descriptor;
  const isStandard = kStandardFonts.includes(fontFamily);

  if (isStandard) return;

  const font = getFont(descriptor);

  // We cache the font to avoid fetching it many times
  if (!font.data && !font.loading) {
    await font.load();
  }
};

const reset = function() {
  for (const font in g_fonts) {
    if (g_fonts.hasOwnProperty(font)) {
      g_fonts[font].data = null;
    }
  }
};

const clear = function() {
  g_fonts = {};
};

export default {
  platformConfig,
  register,
  getRegisteredFonts,
  getRegisteredFontFamilies,
  getFont,
  load,
  clear,
  reset,
  registerHyphenationCallback,
  getHyphenationCallback,
};
