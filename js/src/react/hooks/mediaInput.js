import * as React from 'react';
import { MediaInputContext } from '../contexts';

export function useMediaInput() {
  return React.useContext(MediaInputContext);
}

export function useActiveVideo() {
  const { activeVideoInputSlots } = React.useContext(MediaInputContext);

  let activeIds = [];
  let activeScreenshareIds = [];
  let dominantId = null;
  let maxSimultaneousVideoInputs = activeVideoInputSlots.length;

  for (let i = 0; i < maxSimultaneousVideoInputs; i++) {
    if (activeVideoInputSlots[i]) {
      const videoId = i; // video ids are just indexes to the 'slots' array
      activeIds.push(videoId);
      if (activeVideoInputSlots[i].type === 'screenshare') {
        activeScreenshareIds.push(videoId);
      }
      if (dominantId === null && activeVideoInputSlots[i].dominant) {
        dominantId = videoId;
      }
    }
  }

  return {
    activeIds,
    activeScreenshareIds,
    dominantId,
    maxSimultaneousVideoInputs,
  };
}
