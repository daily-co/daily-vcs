#!/usr/bin/env zx
import 'zx/globals';

const deepgramKey = process.env['DEEPGRAM_API_KEY'] || argv['deepgram-api-key'];
if (!deepgramKey) {
  echo`Error: DEEPGRAM_API_KEY or --deepgram-api-key must be set for transcription`;
  process.exit(1);
}

const inputDir = argv['i'];
if (!inputDir) {
  echo`Error: path to directory containing the raw-tracks recording files must be provided with -i`;
  process.exit(1);
}

let outputDir = argv['o'];
if (!outputDir) {
  outputDir = path.resolve(inputDir, 'processed');
  echo`Defaulting output directory to ${outputDir}`;
}
fs.mkdirpSync(outputDir);

let rawTracksAlignDir = argv['raw-tracks-align-tool-path'];
if (!rawTracksAlignDir) {
  rawTracksAlignDir = '~/bin';
  echo`Defaulting raw-tracks align tool dir to ${rawTracksAlignDir}`;
}
const rawTracksTranscodeAndPadToolPath = path.resolve(
  rawTracksAlignDir,
  'transcode-and-pad.py'
);
if (!fs.existsSync(rawTracksTranscodeAndPadToolPath)) {
  echo`Error: Tool doesn't exist at: ${rawTracksTranscodeAndPadToolPath}`;
  process.exit(2);
}
// ensure ffmpeg is available
await which('ffmpeg');

let res;

// convention: the transcode tool writes files with this suffix
const kCombinedExt = '-combined.mp4';

if (argv['skip-transcode']) {
  echo`Skipping transcode (will assume files already exist)...\n`;
} else {
  const pythonCmd = argv['python-cmd'] || 'python3';

  echo`\n--- starting raw-tracks transcode process ---`;
  res =
    await $`${pythonCmd} ${rawTracksTranscodeAndPadToolPath} --output_dir ${outputDir} --combine-matching-video-and-audio ${inputDir}/*.webm`;

  echo`--- raw-tracks transcode finished ---\n`;
}

// -- discover the combined files
const trackFilesByParticipantId = new Map();
for (const file of fs.readdirSync(outputDir)) {
  let idx;
  if (
    (idx = file.lastIndexOf(kCombinedExt)) ===
    file.length - kCombinedExt.length
  ) {
    let s = file.substring(0, idx);
    idx = s.indexOf('-');
    if (idx > 0 && idx < s.length - 1) {
      const participantId = s.substring(idx + 1);
      trackFilesByParticipantId.set(
        participantId,
        path.resolve(outputDir, file)
      );
    }
  }
}
if (trackFilesByParticipantId.size < 1) {
  echo`Error: Couldn't find any combined track files in ${outputDir}`;
  process.exit(4);
}
echo`Participant id count ${trackFilesByParticipantId.size}: ${JSON.stringify([
  ...trackFilesByParticipantId.keys(),
])}\n`;

// -- discover name and order metadata for participants
const participantsJsonPath = path.resolve(outputDir, 'participants.json');
let participants;
try {
  if (!fs.existsSync(participantsJsonPath)) {
    await createParticipantsMetadataInteractive(
      trackFilesByParticipantId,
      participantsJsonPath
    );
  }
  participants = JSON.parse(
    fs.readFileSync(participantsJsonPath, { encoding: 'utf-8' })
  );
  if (
    !participants.reelId ||
    !participants.namesById ||
    !Array.isArray(participants.orderedIds)
  ) {
    throw new Error(
      'Participants JSON format is incorrect (missing expected top-level keys)'
    );
  }
} catch (e) {
  echo`Error: Couldn't access participant metadata: ${e.message}`;
  process.exit(3);
}
echo`Participant metadata: ${JSON.stringify(participants)}\n`;

const reelId = participants.reelId;

// -- create a mixed audio track
const mixInputArgs = [];
let mixInputCount = 0;
for (const file of [...trackFilesByParticipantId.values()]) {
  mixInputArgs.push('-i', file);
  mixInputCount++;
}
const mixOutputPath = path.resolve(outputDir, `${reelId}_footage.aac`);
res =
  await $`ffmpeg -hide_banner -y ${mixInputArgs} -vn -filter_complex amix=inputs=${mixInputCount} ${mixOutputPath};`;

// -- send mixed audio track to deepgram for transcription
const transcriptPath = path.resolve(
  outputDir,
  `${reelId}_footage.transcript.json`
);
process.env.DEEPGRAM_API_KEY = deepgramKey;
res = await $`node gen-transcript.js -i ${mixOutputPath} -o ${transcriptPath}`;

echo`\nOk, we're done processing inputs.`;
echo`The next step is to extract a section of the transcript that you want to render.`;
echo`Type 'y' if you want to:`;
echo`  * open the extraction GUI in the browser,`;
echo`  * open the input files in the Finder.`;
res = await question();
if (res == 'y') {
  await $`open ${outputDir}`;
  await $`open gui/transcript-extract.html`;
}

echo`\nNext steps:`;
echo`  * Choose an extract in the browser GUI.`;
echo`  * Copy it to the clipboard (in the quoted JSON format).`;
echo`  * Run the cut tool with these arguments:`;
echo`    ${chalk.bold(
  `node gen-cut-from-raw-tracks.js -v social-interview -i ${outputDir} -j [PASTE YOUR JSON HERE]`
)}`;
echo``;
process.exit(0); // --- end of main ---

// --- interactive functions ---

async function createParticipantsMetadataInteractive(trackFiles, jsonPath) {
  echo`Please enter a short name (a.k.a. "reel id") for this project.`;
  echo`It can't contain spaces or other whitespace.`;
  let reelId = await question('  Short name: ');
  reelId = reelId.replace(/\s/g, '');

  const ids = [...trackFiles.keys()];
  const namesById = {};

  echo`\nYou'll now be requested to provide short names / aliases for ${ids.length} participant id(s).`;
  echo`You can use generic aliases that make sense for your project (e.g. 'host').`;
  echo`These aliases can't contain spaces or other whitespace.`;
  echo`\nIf you want to see the participant's movie file, respond with Enter and the movie will open.`;
  for (const id of ids) {
    let name = await question(`  Who is ${id} ? `);
    if (name.length < 1) {
      const moviePath = trackFiles.get(id);
      await $`open ${moviePath}`;
      echo`\n`;
      name = await question(`  Video opened. Who is ${id} ? `);
    }
    if (name.length < 1) {
      echo`Warning: No name provided for participant ${id}. Metadata will be incomplete.\n`;
    } else {
      namesById[id] = name.replace(/\s/g, '');
    }
  }

  let s = '',
    pfix = '';
  for (const name of Object.values(namesById)) {
    s += pfix + name;
    pfix = ', ';
  }
  echo`\nNow please provide a display order for these participants.`;
  echo`This order can affect video compositing (e.g. you may want the host to be the first).`;
  echo`Enter a comma-separated list like the one below.`;
  echo`If the order is correct already, press Enter.`;
  echo`${s}`;
  let orderedStr = await question();

  if (!orderedStr || orderedStr.length < 1) orderedStr = s;

  const orderedNames = orderedStr.split(',').map((s) => s.trim());
  echo`\nOrder is: ${JSON.stringify(orderedNames)}`;

  let orderedIds = [];

  for (const n of orderedNames) {
    let foundId;
    for (const id in namesById) {
      if (namesById[id] === n) {
        foundId = id;
        break;
      }
    }
    if (!foundId) {
      echo`Error: Can't find id for name ${n}. Metadata will be incomplete.`;
    } else {
      orderedIds.push(foundId);
    }
  }

  await fs.writeFile(
    jsonPath,
    JSON.stringify({
      reelId,
      orderedIds,
      namesById,
      movieFilesById: Object.fromEntries(trackFiles),
    })
  );
}
