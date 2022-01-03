import layoutEngine from '@react-pdf/textkit/lib/layout';
import linebreaker from '@react-pdf/textkit/lib/engines/linebreaker';
import justification from '@react-pdf/textkit/lib/engines/justification';
import textDecoration from '@react-pdf/textkit/lib/engines/textDecoration';
import scriptItemizer from '@react-pdf/textkit/lib/engines/scriptItemizer';
import wordHyphenation from '@react-pdf/textkit/lib/engines/wordHyphenation';
import AttributedString from '@react-pdf/textkit/lib/attributedString';

import fontSetup from './font-setup';


const fontSubstitution = () => ({string, runs}) => {
  // no font substitution performed.
  // we assume all fonts are known and available.
  return {string, runs};
};

const kEngines = {
  linebreaker,
  justification,
  textDecoration,
  scriptItemizer,
  wordHyphenation,
  fontSubstitution,
};
const kEngineFn = layoutEngine(kEngines);

export function performTextLayout(attrStringDesc, containerDesc) {
  const attrStr = AttributedString.fromFragments(
    attrStringDesc.fragments
  );

  const options = {
    hyphenationCallback: fontSetup.getHyphenationCallback(),
  };
  return kEngineFn(attrStr, containerDesc, options);
}

export function measureTextLayoutBlocks(blocks) {
  let totalBox = {x: null, y: null, w: 0, h: 0};
  let numLines = 0;

  let lastParagraphSpacing = 0;

  for (const paragraphLinesArr of blocks) {
    totalBox.h += lastParagraphSpacing;

    for (const lineDesc of paragraphLinesArr) {
      const {box, runs} = lineDesc;

      let w = box.width;
      if (runs.length > 0) {
        w = 0;
        for (const run of runs) {
          for (const glyphPos of run.positions) {
            w += glyphPos.xAdvance;
          }
        }
      }
      totalBox.w = Math.max(totalBox.w, w);
      totalBox.h += box.height;
      if (totalBox.x === null) totalBox.x = box.x;
      if (totalBox.y === null) totalBox.y = box.y;

      lastParagraphSpacing = runs.length > 0 ? runs[0].attributes.paragraphSpacing : 0;
      numLines++;
    }
  }

  return {totalBox, numLines};
};