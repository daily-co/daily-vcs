import * as React from 'react';
import { MediaInputContext } from '../contexts/index.js';

export function useMediaInput() {
  return React.useContext(MediaInputContext);
}

export function useViewportSize() {
  const { viewportSize } = React.useContext(MediaInputContext);
  return viewportSize;
}

export function useGrid() {
  const { pixelsPerGridUnit } = React.useContext(MediaInputContext);
  return {
    pixelsPerGridUnit,
  };
}

export function useActiveVideo(opts) {
  const { activeVideoInputSlots } = React.useContext(MediaInputContext);

  let preferScreenshare = false;
  let omitPaused = false;
  if (opts) {
    preferScreenshare = !!opts.preferScreenshare;
    omitPaused = !!opts.omitPaused;
  }

  const memo = React.useMemo(() => {
    let activeIds = [];
    let activeScreenshareIds = [];
    let dominantId = null;
    let displayNamesById = {};
    let pausedById = {};
    let maxSimultaneousVideoInputs = activeVideoInputSlots.length;

    for (let i = 0; i < maxSimultaneousVideoInputs; i++) {
      const slot = activeVideoInputSlots[i];
      if (!slot) continue;

      const videoId = slot.id !== undefined ? slot.id : i;
      const paused = !!slot.paused;

      if (!omitPaused || !paused) {
        activeIds.push(videoId);

        if (slot.type === 'screenshare') {
          activeScreenshareIds.push(videoId);
        }
        if (dominantId == null && slot.dominant) {
          dominantId = videoId;
        }
      }
      displayNamesById[videoId] = slot.displayName;
      pausedById[videoId] = paused;
    }

    if (preferScreenshare && activeScreenshareIds.length > 0) {
      // if requested, move screenshare ids to first in array
      activeIds = activeIds.filter((id) => !activeScreenshareIds.includes(id));
      activeIds = activeScreenshareIds.concat(activeIds);
    }

    return {
      activeIds,
      activeScreenshareIds,
      dominantId,
      displayNamesById,
      pausedById,
      maxSimultaneousVideoInputs,
    };
  }, [activeVideoInputSlots, preferScreenshare, omitPaused]);

  return memo;
}
