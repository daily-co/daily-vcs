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
