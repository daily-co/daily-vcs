import fontSetup from '../src/text/font-setup.js';
import { standardFontFamilies } from '../src/text/standard-fonts.js';
import * as Path from 'path';
import { fileURLToPath } from 'url';
import { logToHostInfo } from './log.js';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

// FIXME: figure out better way to get resource path?
const kResDir = Path.resolve(__dirname, '../../res/fonts');

// callback for font loading
fontSetup.platformConfig.loadFontSourceAsync = async function (
  fontSrc,
  fetchFont,
  fontkit
) {
  // load local font using the helper available via fontkit

  const filePath = Path.join(kResDir, fontSrc.src);
  //logToHostInfo('loading fontsrc: ', filePath);

  return new Promise((resolve, reject) =>
    fontkit.open(filePath, (err, data) => (err ? reject(err) : resolve(data)))
  );
};

// main entry point for font setup
export async function loadFontsAsync(wantedFamilies) {
  const knownFamilies = standardFontFamilies;

  if (!Array.isArray(wantedFamilies)) {
    // add default font if nothing else was specified
    wantedFamilies = ['Roboto'];
  }

  for (const { family, variants } of knownFamilies) {
    if (!wantedFamilies.includes(family)) continue;

    for (const { fileName, fontWeight, fontStyle } of variants) {
      const src = fileName;
      const fontDesc = {
        family,
        src,
        fontWeight,
        fontStyle,
      };
      fontSetup.register(fontDesc);
    }
  }

  //logToHostInfo('fonts registered: ', fontSetup.getRegisteredFonts());

  const allFonts = fontSetup.getRegisteredFonts();
  let fontsToLoad = [];
  for (const key in allFonts) {
    const fontObj = allFonts[key];
    const sources = fontObj.sources;
    fontsToLoad = fontsToLoad.concat(sources);
  }
  //logToHostInfo('fonts to load: ', fontsToLoad);
  const fontPromises = [];
  for (const font of fontsToLoad) {
    fontPromises.push(fontSetup.load(font));
  }
  await Promise.all(fontPromises);
  logToHostInfo('%d fonts loaded', fontsToLoad.length);
}
