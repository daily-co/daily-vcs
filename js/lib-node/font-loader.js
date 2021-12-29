import fontSetup from '../src/text/font-setup';
import * as Path from 'path';
import { logToHostInfo } from './log';

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
  logToHostInfo('loading fontsrc: ', filePath);

  return new Promise((resolve, reject) =>
    fontkit.open(filePath, (err, data) => (err ? reject(err) : resolve(data)))
  );
};

// main entry point for font setup
export async function loadFontsAsync(wantedFamilies) {
  const robotoVariants = [
    { fileName: 'Roboto-Regular.ttf' },
    { fileName: 'Roboto-Bold.ttf', fontWeight: 700 },
    { fileName: 'Roboto-Italic.ttf', fontStyle: 'italic' },
    { fileName: 'Roboto-BoldItalic.ttf', fontWeight: 700, fontStyle: 'italic' },
    { fileName: 'Roboto-Thin.ttf', fontWeight: 100 },
    { fileName: 'Roboto-ThinItalic.ttf', fontWeight: 100, fontStyle: 'italic' },
    { fileName: 'Roboto-Light.ttf', fontWeight: 300 },
    {
      fileName: 'Roboto-LightItalic.ttf',
      fontWeight: 300,
      fontStyle: 'italic',
    },
    { fileName: 'Roboto-Medium.ttf', fontWeight: 500 },
    {
      fileName: 'Roboto-MediumItalic.ttf',
      fontWeight: 500,
      fontStyle: 'italic',
    },
    { fileName: 'Roboto-Black.ttf', fontWeight: 900 },
    {
      fileName: 'Roboto-BlackItalic.ttf',
      fontWeight: 900,
      fontStyle: 'italic',
    },
  ];

  const knownFamilies = [
    {
      family: 'Roboto',
      variants: robotoVariants,
    },
  ];

  let fontDescs = [];
  for (const fontDesc of fontDescs) {
    const { postscriptName, fileName } = fontDesc;
    knownFamilies.push({
      family: postscriptName,
      variants: [{ fileName }],
    });
  }

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
