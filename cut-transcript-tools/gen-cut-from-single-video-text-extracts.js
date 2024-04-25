import * as fs from 'node:fs';
import { parseArgs } from 'node:util';

/*
  Takes a Deepgram format transcript and finds timecodes for given text extracts
  within a single video file.

  Writes a VCSCut file containing a sequence of the extract clips.

  A source id (to be written in the clips items) can be provided in the extracts JSON file.
  Otherwise a default source id will be used.
*/

// --- inputs ---

const args = parseArgs({
  options: {
    transcript_json: {
      type: 'string',
      short: 't',
    },
    extracts_json: {
      type: 'string',
      short: 'e',
    },
    input_video: {
      type: 'string',
      short: 'v',
    },
    output_json: {
      type: 'string',
      short: 'o',
    },
  },
});

const transcriptJsonPath = args.values.transcript_json;
if (!transcriptJsonPath || transcriptJsonPath.length < 1) {
  console.error('transcript input is required');
  process.exit(1);
}
const transcriptObj = JSON.parse(
  fs.readFileSync(transcriptJsonPath, { encoding: 'utf-8' })
);

const { words } = transcriptObj.results?.channels[0].alternatives[0];
if (!Array.isArray(words)) {
  console.error('transcript object not in expected format');
  process.exit(2);
}
//console.log("transcript words count: ", words.length);

const extractsJsonPath = args.values.extracts_json;
if (!extractsJsonPath || extractsJsonPath.length < 1) {
  console.error('extracts input is required');
  process.exit(1);
}
const extractsObj = JSON.parse(
  fs.readFileSync(extractsJsonPath, { encoding: 'utf-8' })
);

const { extracts, sourceId = 'defaultsource' } = extractsObj;
if (!Array.isArray(extracts)) {
  console.error("extracts input JSON must contain 'extracts' array");
  process.exit(2);
}

const inputVideoPath = args.values.input_video;

const outputJsonPath = args.values.output_json;

// --- main ---

// this is the output JSON
const edl = {
  sources: [
    {
      id: sourceId,
      path: inputVideoPath,
    },
  ],
  clips: [],
  cut: {
    duration: 0,
    events: [],
  },
  audio: [],
};

let idx = 0;

for (const extract of extracts) {
  idx++; // for clip ids; ordering should match the input even if we can't find the text

  const { transcriptText } = extract;
  const extractTc = findTimecodesForExtractInTranscript(transcriptText, words);
  if (!extractTc) {
    console.error('Unable to find text in transcript: ', transcriptText);
    continue;
  }

  const clipDur = extractTc.end - extractTc.start;
  const clipId = `c_${sourceId}_${idx}`;

  edl.clips.push({
    start: extractTc.start,
    duration: clipDur,
    description: transcriptText,
    id: clipId,
    source: sourceId,
  });

  edl.audio.push({
    clipId,
    duration: clipDur,
  });

  const cutStartT = edl.cut.duration;

  edl.cut.duration += clipDur;

  const cutVideoEv = {
    t: cutStartT,
    clips: [clipId],
  };
  if (edl.cut.events.length < 1) {
    // initialize layout params in first event
    cutVideoEv.params = {
      mode: 'single',
      ...makeTextParams(),
      ...makeImageParams(),
    };
  }

  if (extract.caption?.length > 0) {
    cutVideoEv.params = {
      ...cutVideoEv.params,
      showTextOverlay: true,
      'text.content': extract.caption,
    };
  }
  if (extract.emojiCodepoint?.indexOf('U+') === 0) {
    try {
      const u = extract.emojiCodepoint.slice(2);
      const s = String.fromCodePoint(parseInt(u, 16));

      cutVideoEv.params = {
        ...cutVideoEv.params,
        showImageOverlay: true,
        'image.emoji': s,
      };
    } catch (e) {
      console.error(
        '** Unable to convert emojiCodepoint %s: ',
        extract.emojiCodepoint,
        e
      );
    }
  }

  edl.cut.events.push(cutVideoEv);
}

const outputJson = JSON.stringify(edl, null, 2);

if (outputJsonPath?.length > 0) {
  fs.writeFileSync(outputJsonPath, outputJson, { encoding: 'utf-8' });
} else {
  console.log(outputJson);
}

process.exit(0);

// --- functions ---

function findTimecodesForExtractInTranscript(extractText, words) {
  // finds subarray 'extractText' in 'words'.
  // no caching, but should be fine here since we expect to have only a couple of extracts to process.

  const extractWords = extractText.split(' ');
  let pos = 0;

  let startIdx = -1;
  for (let i = 0; i < words.length; i++) {
    // deepgram provides punctuated words that match their transcript,
    // so we don't need to process the source further
    const w = words[i].punctuated_word;

    if (pos > 0 && w !== extractWords[pos]) {
      pos = 0;
    }

    if (w === extractWords[pos]) {
      if (pos === 0) startIdx = i;
      pos++;
      if (pos === extractWords.length) {
        // full match found.
        // return the start / end time values for the transcript words
        return {
          start: words[startIdx].start,
          end: words[startIdx + pos].end,
        };
      }
    }
  }

  return null;
}

function makeTextParams() {
  return {
    'text.align_horizontal': 'center',
    'text.align_vertical': 'bottom',
    'text.offset_x_gu': 0,
    'text.offset_y_gu': 10,
    'text.rotation_deg': 0,
    'text.scale_x': 1,
    'text.fontSize_gu': 3.8,
    'text.strokeColor': 'rgba(0, 0, 50, 0.5)',
    'text.stroke_gu': 0.6,
    'text.fontWeight': '500',
    'text.fontFamily': 'Bitter',
    'text.color': 'cornflowerblue',
  };
}

function makeImageParams() {
  return {
    'image.aspectRatio': 1,
    'image.position': 'top-right',
  };
}
