import * as fs from 'node:fs';
import * as Path from 'node:path';
import { parseArgs } from 'node:util';

import * as Deepgram from '@deepgram/sdk';

const args = parseArgs({
  options: {
    input: {
      type: 'string',
      short: 'i',
    },
    output: {
      type: 'string',
      short: 'o',
    },
    language: {
      type: 'string',
      short: 'l',
    },
    api_key: {
      type: 'string',
      short: 'k',
    },
  },
});

const inputAudioPath = args.values.input;
if (!inputAudioPath || inputAudioPath.length < 1) {
  console.error('Input is required');
  process.exit(1);
}
if (!fs.existsSync(inputAudioPath)) {
  console.error("Input file doesn't exist");
  process.exit(2);
}

let outputJsonPath = args.values.output;
if (!outputJsonPath || outputJsonPath.length < 1) {
  let outputBase = inputAudioPath;
  let idx = inputAudioPath.lastIndexOf('.');
  if (idx >= 0) {
    outputBase = inputAudioPath.substring(0, idx);
  }
  outputJsonPath = `${outputBase}.transcript.json`;
  console.log('Writing output to inferred destination: %s', outputJsonPath);
}

let language = args.values.language;
if (!language || language.length < 1) {
  language = 'en';
  console.log('Defaulting language to %s', language);
}

let dgApiKey = args.values.api_key || process.env.DEEPGRAM_API_KEY;
if (!dgApiKey || dgApiKey.length < 1) {
  console.error('Deepgram API key not set');
  process.exit(2);
}

const deepgram = Deepgram.createClient(dgApiKey);

let dgOptions = {
  model: 'nova-2',
  smart_format: true,
  diarize: true,
  punctuate: true,
  paragraphs: true,
  utterances: false, // cleaner transcript is good for extract GUI
  language,
};

console.log('Calling Deepgram API...');

const { result: dgRes, error } =
  await deepgram.listen.prerecorded.transcribeFile(
    fs.createReadStream(inputAudioPath),
    dgOptions
  );
if (error) {
  console.error('** Deepgram transcription failed: ', error);
  process.exit(3);
}

fs.writeFileSync(outputJsonPath, JSON.stringify(dgRes));

console.log('Transcript JSON written to: ', outputJsonPath);
