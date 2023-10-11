import fontSetup from '../src/text/font-setup.js';
import {
  standardFontFamilies,
  emojiFontFamilyName,
  defaultFontFamilyName,
} from '../src/text/standard-fonts.js';

// callback for font loading
fontSetup.platformConfig.loadFontSourceAsync = async function (
  fontSrc,
  fetchFont,
  fontkit
) {
  const { headers, body, method = 'GET' } = fontSrc.options;
  const data = await fetchFont(fontSrc.src, { method, body, headers });
  //console.log("cb got font data, len %d, '%s'", data.length, fontSrc.src);
  return fontkit.create(data);
};

// main entry point for font setup
export async function loadFontsAsync(
  getAssetUrlCb,
  appendPreloadToDOMFunc,
  wantedFamilies
) {
  const knownFamilies = standardFontFamilies;

  if (!Array.isArray(wantedFamilies)) {
    // add default font if nothing else was specified
    wantedFamilies = [defaultFontFamilyName];
  }

  // in `lib-node/font-loader.js`, we load the emoji font explicitly with:
  ///  wantedFamilies = wantedFamilies.concat(emojiFontFamilyName);
  // let's not do that in the browser because it's quite large (~20 MB).
  // the browser text system will use the system emoji font
  // when we render in `canvas.js`.

  for (const { family, variants } of knownFamilies) {
    if (!wantedFamilies.includes(family)) continue;

    for (const { fileName, fontWeight, fontStyle } of variants) {
      const src = getAssetUrlCb(fileName, 'default', 'font');
      if (!src || src.length < 1) {
        console.error("** couldn't get asset URL for font '%s'", fileName);
        continue;
      }
      const fontDesc = {
        family,
        src,
        fontWeight,
        fontStyle,
      };
      fontSetup.register(fontDesc);

      // add the font to DOM
      appendCssForFontDesc(fontDesc, appendPreloadToDOMFunc);
    }
  }

  //console.log('fonts registered: ', fontSetup.getRegisteredFonts());

  const allFonts = fontSetup.getRegisteredFonts();
  let fontsToLoad = [];
  for (const key in allFonts) {
    const fontObj = allFonts[key];
    const sources = fontObj.sources;
    fontsToLoad = fontsToLoad.concat(sources);
  }
  //console.log('fonts to load: ', fontsToLoad);
  const fontPromises = [];
  for (const font of fontsToLoad) {
    fontPromises.push(fontSetup.load(font));
  }
  await Promise.all(fontPromises);
  //console.log('fonts loaded');
}

// utility for registering fonts.
// adds a style declaration to the document head
// and a hidden text element using the font.
function appendCssForFontDesc(fontDesc, appendPreloadToDOMFunc) {
  var weight = fontDesc.fontWeight || 400;
  var style = fontDesc.fontStyle || 'normal';

  var newStyle = document.createElement('style');
  newStyle.appendChild(
    document.createTextNode(`
@font-face {
src: url('${fontDesc.src}');
font-family: "${fontDesc.family}";
font-weight: ${weight};
font-style: ${style};
}
  `)
  );
  document.head.appendChild(newStyle);

  if (appendPreloadToDOMFunc) {
    var hiddenDivWithFont = document.createElement('div');
    hiddenDivWithFont.className = 'font-preload';
    hiddenDivWithFont.appendChild(document.createTextNode('font preload'));
    hiddenDivWithFont.setAttribute(
      'style',
      `
      font-family: "${fontDesc.family}";
      font-weight: ${weight};
      font-style: ${style};
      position: relative;
    `
    );
    appendPreloadToDOMFunc(hiddenDivWithFont);
  }
}
