import * as React from 'react';
import { RoomContext } from '../contexts/index.js';

export function useAudioOnlyPeers() {
  const { availablePeers } = React.useContext(RoomContext);

  return React.useMemo(() => {
    return availablePeers.filter((peer) => {
      const { video, screenshareVideo, audio } = peer;
      return (
        audio &&
        audio.id != null &&
        (!video || video.id == null) &&
        (!screenshareVideo || screenshareVideo.id == null)
      );
    });
  }, [availablePeers]);
}

export function useUnpausedPeers(filterTypes) {
  const { availablePeers } = React.useContext(RoomContext);

  return React.useMemo(() => {
    let allowedTypes;
    if (Array.isArray(filterTypes)) {
      allowedTypes = filterTypes;
    } else if (typeof filterTypes === 'string') {
      allowedTypes = filterTypes.split(',').map((s) => s.trim());
    } else {
      allowedTypes = ['video', 'screenshare', 'audio'];
    }

    return availablePeers.filter((peer) => {
      const { video, screenshareVideo, audio } = peer;
      const videoAvailable = video && video.id && !video.paused;
      const screenshareAvailable =
        screenshareVideo && screenshareVideo.id && !screenshareVideo.paused;
      const audioAvailable = audio && audio.id && !audio.paused;

      return (
        (videoAvailable && allowedTypes.includes('video')) ||
        (screenshareAvailable && allowedTypes.includes('screenshare')) ||
        (audioAvailable && allowedTypes.includes('audio'))
      );
    });
  }, [availablePeers, filterTypes]);
}
