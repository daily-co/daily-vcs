export function parseClipTime(tc) {
  let t;
  if (typeof tc === 'string') {
    let idx;
    if ((idx = tc.indexOf(':')) !== -1) {
      // TODO: support also this format HH:MM:SS.MILLI
      throw new Error('Timecode format not yet supported: ' + tc);
    }
    t = parseFloat(tc);
  } else if (typeof tc === 'number') {
    t = tc;
  } else {
    throw new Error('Invalide type for timecode value: ' + typeof tc);
  }
  if (!Number.isFinite(t)) {
    throw new Error('Invalid timecode, number not valid: ' + tc);
  }
  return t;
}
