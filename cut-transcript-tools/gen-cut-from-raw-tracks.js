import * as fs from 'node:fs';
import { parseArgs } from 'node:util';
import * as Path from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

/*
  Takes a directory created by the `prepare-raw-tracks-for-cut` tool
  and a JSON describing the extract to be performed.

  Writes a VCSCut file describing the composite for the extract.
  By default the JSON file is placed in the input directory.
*/

const rl = readline.createInterface({ input: stdin, output: stdout });

// --- inputs ---

const args = parseArgs({
  options: {
    input_dir: {
      type: 'string',
      short: 'i',
    },
    extracts_json: {
      type: 'string',
      short: 'j',
    },
    output_json: {
      type: 'string',
      short: 'o',
    },
    reel_id: {
      type: 'string',
      short: 'n',
    },
    visual_template: {
      type: 'string',
      short: 'v',
    },
  },
});

const inputDir = args.values.input_dir;
if (!inputDir) {
  console.error('** Expected argument -i');
  process.exit(1);
}

// the input dir must contain files written by the prepare-raw-tracks tool
const participantsJsonPath = Path.resolve(inputDir, 'participants.json');
const participantsMetadata = JSON.parse(
  fs.readFileSync(participantsJsonPath, { encoding: 'utf-8' })
);

// the input dir
let transcript;
for (const file of fs.readdirSync(inputDir)) {
  if (file.indexOf('.transcript.json') !== -1) {
    const transcriptObj = JSON.parse(
      fs.readFileSync(Path.resolve(inputDir, file), { encoding: 'utf-8' })
    );
    // extract relevant data from the Deepgram format
    const alt = transcriptObj.results?.channels[0].alternatives[0];
    if (alt) {
      const words = { alt };
      const { paragraphs } = alt.paragraphs;
      transcript = {
        words,
        paragraphs,
      };
    }
    break;
  }
}

const inputJson = JSON.parse(args.values.extracts_json);
const extractRangesJson = inputJson.extracts;
if (!Array.isArray(extractRangesJson)) {
  console.error("** Input JSON doesn't have expected array for key 'extracts'");
  process.exit(2);
}

if (
  !Array.isArray(participantsMetadata.orderedIds) ||
  participantsMetadata.orderedIds.length < 1
) {
  console.error(
    '** Participants orderedIds is invalid or empty: ',
    participantsMetadata.orderedIds
  );
  process.exit(2);
}

const reelId = args.values.reel_id || participantsMetadata.reelId;
if (!reelId) {
  console.error(
    '** Expected argument -n (reel id) or reelId property in participants metadata'
  );
  process.exit(1);
}
if (reelId.indexOf(' ') !== -1) {
  console.error("** Reel id can't contain spaces");
  process.exit(1);
}
console.log(`Reel id ${reelId}`);

let outputJsonPath = args.values.output_json;
if (!outputJsonPath) {
  outputJsonPath = Path.resolve(inputDir, `${reelId}.vcscut.json`);
}

const visualTemplateName = args.values.visual_template;
if (!visualTemplateName) {
  console.error('Error: visual template name must be provided with -v');
  process.exit(1);
}
const visualTemplateModule = await import(
  `./visual-template-plugins/${visualTemplateName}.js`
);
if (!visualTemplateModule.createCutEventsInteractive) {
  console.error(
    "Error: visual template module doesn't have expected export 'createCutEventsInteractive'"
  );
  process.exit(2);
}
console.log(`Using visual template ${visualTemplateName}\n`);

// --- main ---

// we know our sources are temporally aligned (from the prepare-raw-tracks phase).
// indicate this by adding the same timelineId to all the source descriptions.
// it only needs to be unique within the cut, so we can use a fixed string.
const timelineId = 'tl1';

const sources = [];
for (const id of participantsMetadata.orderedIds) {
  const path = participantsMetadata.movieFilesById[id];
  if (!path) {
    console.error('** No movie file provided in metadata for %s', id);
    process.exit(2);
  }
  sources.push({
    id,
    path,
    displayName: participantsMetadata.namesById[id],
    timelineId,
  });
}

// this is the output JSON
const edl = {
  reelId: reelId,
  meta: {
    description: `${reelId} generated from raw-tracks`,
  },
  sources,
  clips: [],
  cut: {
    duration: 0,
    events: [],
    audio: [],
  },
};

let t = 0;
let clipIdx = 1;

for (const range of extractRangesJson) {
  const { start, end } = range;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    console.error(
      'Invalid object in extractRanges JSON, must have start and end number values: ',
      range
    );
    process.exit(2);
  }
  const duration = end - start;
  if (duration <= 0) {
    console.error('** Duration specified for range is invalid: ', duration);
    process.exit(2);
  }

  edl.cut.duration += duration;

  // create a clip for each input
  const clipIds = [];

  for (const source of sources) {
    const clipIdBase =
      source.displayName?.length > 0 ? source.displayName : source.id;
    const clipId = `${clipIdBase}${clipIdx}`;
    clipIds.push(clipId);

    edl.clips.push({
      id: clipId,
      source: source.id,
      start,
      duration,
    });
  }

  edl.cut.audio.push({
    clips: clipIds,
    duration,
  });

  edl.cut.events.push({
    t,
    clips: clipIds,
    sourceTimelineOffset: {
      timelineId,
      start,
      end,
    },
  });

  t += duration;
  clipIdx++;
}

// allow visual template plugin to rewrite events
const visualTemplateData = {
  duration: edl.cut.duration,
  defaultEvents: edl.cut.events,
  participants: participantsMetadata,
  transcript,
  transcriptTimelineId: timelineId,
};

// use previously saved state if available and user accepts
let visualTemplateState;
const visualTemplateStateJsonPath = Path.resolve(
  inputDir,
  'visualTemplate.json'
);
if (fs.existsSync(visualTemplateStateJsonPath)) {
  const response = await rl.question('Use existing visual template settings? ');
  if (response.toLowerCase() === 'y') {
    visualTemplateState = JSON.parse(
      fs.readFileSync(visualTemplateStateJsonPath, { encoding: 'utf-8' })
    );
  }
}

let visualTemplateRet;
if (visualTemplateState) {
  visualTemplateRet = await visualTemplateModule.createCutEventsFromSavedState(
    visualTemplateState,
    visualTemplateData
  );
} else {
  visualTemplateRet = await visualTemplateModule.createCutEventsInteractive(
    { print: console.log, question: rl.question.bind(rl) },
    visualTemplateData
  );
  if (visualTemplateRet.state) {
    const json = JSON.stringify({
      ...visualTemplateRet.state,
      templateId: visualTemplateName,
    });
    fs.writeFileSync(visualTemplateStateJsonPath, json, { encoding: 'utf-8' });
  }
}

if (Array.isArray(visualTemplateRet.events)) {
  edl.cut.events = cleanUpEvents(visualTemplateRet.events);
} else {
  console.log(
    "Warning: visual template didn't render events: ",
    visualTemplateRet
  );
}

// write output
const outputJson = JSON.stringify(edl, null, 2);
fs.writeFileSync(outputJsonPath, outputJson, { encoding: 'utf-8' });

console.log(`\nOutput written to: ${outputJsonPath}`);
console.log(`\nYou can render the cut with this command:`);
console.log(`(Replace w / h with the output size you want)`);
console.log(
  `     npx zx vcscut-render.zx.mjs -i ${outputJsonPath} --output-suffix _portrait -w 1080 -h 1920\n`
);

process.exit(0);

// --- functions ---

function cleanUpEvents(evs) {
  // ensure events are sorted by time
  evs.sort((a, b) => a.t - b.t);

  // merge events that have the same timestamp
  const n = evs.length;
  const delList = [];
  let prevT = -1;
  let prevEv;
  for (let i = 0; i < n; i++) {
    const ev = evs[i];
    if (prevEv && ev.t === prevT) {
      delList.push(i);
      mergeEvent(prevEv, ev);
    } else {
      prevT = ev.t;
      prevEv = ev;
    }
  }

  let delCount = 0;
  for (const idx of delList) {
    evs.splice(idx - delCount, 1);
    delCount++;
  }

  function mergeEvent(dst, src) {
    const { clips, params } = src;

    // clips is an array, we can't merge the values
    if (clips) dst.clips = clips;

    if (params) {
      let dstParams = dst.params || {};
      dstParams = { ...dstParams, ...params };
      dst.params = dstParams;
    }
  }

  return evs;
}
