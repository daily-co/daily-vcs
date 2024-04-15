#!/usr/bin/env zx
import 'zx/globals';

const inputPath = argv['i'];
if (!inputPath) {
  echo`Error: path to VCSCut file must be provided with -i`;
  process.exit(1);
}

let reelId = JSON.parse(
  fs.readFileSync(inputPath, { encoding: 'utf-8' })
).reelId;
echo`reelId: ${reelId}`;

let outputPath = argv['o'];
if (!outputPath) {
  let filename = path.basename(inputPath);
  const idx = filename.indexOf('.'); // remove all file extensions
  if (idx > 0) filename = filename.substring(0, idx);

  const dir = path.dirname(inputPath);

  const suffix = argv['output-suffix'] || '';

  outputPath = path.resolve(dir, `${filename}${suffix}.mp4`);

  echo`Defaulting output to ${outputPath}`;
}
const outputDir = path.dirname(outputPath);
fs.mkdirpSync(outputDir);

const cutToolDir = path.resolve('../server-render/vcscut');
if (
  !fs.existsSync(cutToolDir) ||
  !fs.existsSync(path.resolve(cutToolDir, 'cut.js'))
) {
  echo`Error: VCSCut tools must be at sibling path: ${cutToolDir}`;
  process.exit(2);
}
const vcsRenderDir = path.resolve('../server-render/vcsrender');
if (
  !fs.existsSync(vcsRenderDir) ||
  !fs.existsSync(path.resolve(vcsRenderDir, 'build/vcsrender'))
) {
  echo`Error: VCSRender tools must be at sibling path: ${vcsRenderDir}`;
  echo`Note that the vcsrender binary must be built separately.`;
  process.exit(2);
}
const vcsSdkDir = path.resolve('../js');
if (
  !fs.existsSync(vcsSdkDir) ||
  !fs.existsSync(path.resolve(vcsSdkDir, 'vcs-batch-runner.js'))
) {
  echo`Error: VCS SDK must be at sibling path: ${vcsSdkDir}`;
  process.exit(2);
}

const w = argv['w'] || 1920;
const h = argv['h'] || 1080;
const fps = argv['fps'] || 30;

// --- main ---

await within(async () => {
  cd(cutToolDir);

  await $`node cut.js -i ${inputPath} --w ${w} --h ${h} --fps ${fps}`;
});

// currently the cut tool outputs to its own temp dir.
// check that the expected output is there.

const vcsEventsJsonPath = path.resolve(
  cutToolDir,
  'cut-tmp',
  'cut.vcsevents.json'
);
if (!fs.existsSync(vcsEventsJsonPath)) {
  echo`Error: VCSCut tool didn't produce expected output at: ${vcsEventsJsonPath}`;
  process.exit(2);
}
const vcsInputTimingsJsonPath = path.resolve(
  cutToolDir,
  'cut-tmp',
  'cut.vcsinputtimings.json'
);
if (!fs.existsSync(vcsInputTimingsJsonPath)) {
  echo`Error: VCSCut tool didn't produce expected output at: ${vcsInputTimingsJsonPath}`;
  process.exit(2);
}
const cutTempAudioPath = path.resolve(
  cutToolDir,
  'cut-tmp',
  'cut_audio_mix.m4a'
);
if (!fs.existsSync(cutTempAudioPath)) {
  echo`Error: VCSCut tool didn't produce expected output at: ${cutTempAudioPath}`;
  process.exit(2);
}

echo`\n --- Executing VCS batch runner... ---`;

const batchRunnerOutputDir = path.resolve(outputDir, 'vcs-state');

await within(async () => {
  cd(vcsSdkDir);

  await $`node vcs-batch-runner.js --events_json ${vcsEventsJsonPath} --output_prefix ${batchRunnerOutputDir}/seq --clean_output_dir`;
});

const renderYuvSeqOutputDir = path.resolve(outputDir, 'vcs-render-yuv');

await fs.emptyDir(renderYuvSeqOutputDir);

const videoOutputPath = path.resolve(outputDir, `${reelId}_video.m4v`);

await within(async () => {
  cd(vcsRenderDir);

  echo`\n --- Executing VCS render... ---`;

  await $`build/vcsrender --oseq ${renderYuvSeqOutputDir} --input_timings ${vcsInputTimingsJsonPath} --jsonseq ${batchRunnerOutputDir} -w ${w} -h ${h}`;

  echo`\n --- Encoding video... ---`;

  await $`./convert_yuvseq_to_movie.sh ${renderYuvSeqOutputDir} ${w}x${h} ${fps} ${videoOutputPath}`;
});

echo`\n --- Muxing final movie file... ---`;

await $`ffmpeg -hide_banner -y -i ${videoOutputPath} -i ${cutTempAudioPath} -c copy -map 0:0 -map 1:0 ${outputPath}`;

await fs.rm(videoOutputPath);

echo`\nDone. Output at: ${outputPath}`;
