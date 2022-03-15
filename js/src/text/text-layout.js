import module_layoutEngine from '@react-pdf/textkit/lib/layout/index.js';
import module_linebreaker from '@react-pdf/textkit/lib/engines/linebreaker/index.js';
import module_justification from '@react-pdf/textkit/lib/engines/justification/index.js';
import module_textDecoration from '@react-pdf/textkit/lib/engines/textDecoration/index.js';
import module_scriptItemizer from '@react-pdf/textkit/lib/engines/scriptItemizer/index.js';
import module_wordHyphenation from '@react-pdf/textkit/lib/engines/wordHyphenation/index.js';
import module_AttributedString from '@react-pdf/textkit/lib/attributedString/index.js';

const layoutEngineFactory = module_layoutEngine.default || module_layoutEngine;
const linebreaker = module_linebreaker.default || module_linebreaker;
const justification = module_justification.default || module_justification;
const textDecoration = module_textDecoration.default || module_textDecoration;
const scriptItemizer = module_scriptItemizer.default || module_scriptItemizer;
const wordHyphenation =
  module_wordHyphenation.default || module_wordHyphenation;
const AttributedString =
  module_AttributedString.default || module_AttributedString;

import fontSetup from './font-setup.js';

const fontSubstitution = () => ({ string, runs }) => {
  // no font substitution performed.
  // we assume all fonts are known and available.
  return { string, runs };
};

const kEngines = {
  linebreaker,
  justification,
  textDecoration,
  scriptItemizer,
  wordHyphenation,
  fontSubstitution,
};
const kEngineFn = layoutEngineFactory(kEngines);

export function performTextLayout(attrStringDesc, containerDesc) {
  const attrStr = AttributedString.fromFragments(attrStringDesc.fragments);

  const options = {
    hyphenationCallback: fontSetup.getHyphenationCallback(),
  };
  return kEngineFn(attrStr, containerDesc, options);
}

export function measureTextLayoutBlocks(blocks) {
  let totalBox = { x: null, y: null, w: 0, h: 0 };
  let numLines = 0;

  let lastParagraphSpacing = 0;

  for (const paragraphLinesArr of blocks) {
    totalBox.h += lastParagraphSpacing;

    for (const lineDesc of paragraphLinesArr) {
      const { box, runs } = lineDesc;

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

      lastParagraphSpacing =
        runs.length > 0 ? runs[0].attributes.paragraphSpacing : 0;
      numLines++;
    }
  }

  return { totalBox, numLines };
}
