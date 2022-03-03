import * as React from 'react';
import { MediaInputContext } from '../contexts';

export function useMediaInput() {
  return React.useContext(MediaInputContext);
}

export function useViewportSize() {
  const { viewportSize } = React.useContext(MediaInputContext);
  return viewportSize;
}

export function useActiveVideo() {
  const { activeVideoInputSlots } = React.useContext(MediaInputContext);

  const memo = React.useMemo(() => {
    let activeIds = [];
    let activeScreenshareIds = [];
    let dominantId = null;
    let displayNamesById = {};
    let maxSimultaneousVideoInputs = activeVideoInputSlots.length;

    for (let i = 0; i < maxSimultaneousVideoInputs; i++) {
      const slot = activeVideoInputSlots[i];
      if (!slot) continue;

      const videoId = slot.id !== undefined ? slot.id : i;

      activeIds.push(videoId);

      if (slot.type === 'screenshare') {
        activeScreenshareIds.push(videoId);
      }
      if (dominantId === null && slot.dominant) {
        dominantId = videoId;
      }
      displayNamesById[videoId] = slot.displayName;
    }

    return {
      activeIds,
      activeScreenshareIds,
      dominantId,
      displayNamesById,
      maxSimultaneousVideoInputs,
    };
   }, [activeVideoInputSlots]);
   
   return memo;
}
