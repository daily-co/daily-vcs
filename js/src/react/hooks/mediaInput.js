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

  const maxCamStreams = opts?.maxCamStreams || 25;
  const preferScreenshare = opts?.preferScreenshare || false;
  const omitPaused = opts?.omitPaused || false;

  const memo = React.useMemo(() => {
    let numCamStreams = 0;
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
        if (slot.type === 'screenshare') {
          activeIds.push(videoId);
          activeScreenshareIds.push(videoId);
        } else {
          if (numCamStreams < maxCamStreams) {
            // We have enough space
            activeIds.push(videoId);
            numCamStreams++;
          } else if (slot.dominant) {
            // We ran out of space, but prefer dominant video
            // FIXME: do we need to deal with multiple dominants?
            activeIds.pop();
            activeIds.push(videoId);
          }
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
  }, [activeVideoInputSlots, maxCamStreams, preferScreenshare, omitPaused]);

  return memo;
}
