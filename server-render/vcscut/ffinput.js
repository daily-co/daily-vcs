import { runFfmpegCommandAsync } from './ffexec.js';

export async function extractYuvSeqAsync(id, src, dst, start, duration) {
  const args = [
    '-ss',
    start,
    '-t',
    duration,
    '-i',
    src,
    '-pix_fmt',
    'yuv420p',
    '-f',
    'segment',
    '-segment_time',
    '0.01',
    dst,
  ];
  return runFfmpegCommandAsync(`extractYuvVideo_${id}`, args);
}

export async function extractWavAudioAsync(id, src, dst, start, duration) {
  const args = [
    '-ss',
    start,
    '-t',
    duration,
    '-i',
    src,
    '-acodec',
    'pcm_s16le',
    '-ar',
    '44100',
    '-ac',
    '2',
    dst,
  ];
  return runFfmpegCommandAsync(`extractWavAudio_${id}`, args);
}
