import * as React from 'react';
import { useActiveVideo, useAudioOnlyPeers } from '#vcs-react/hooks';

// a utility hook that builds the list of participants to be displayed.
// it first includes the video input slots, then any audio-only participants
// that are described in the room metadata (RoomContext via useAudioOnlyPeers).
//
// the reason why we don't just rely on the room metadata is that a VCS host
// app might not be a video conference setup, and we want this composition
// to be able to render a useful view from whatever video inputs are available.
//
export function useActiveVideoAndAudio({
  maxCamStreams = 25,
  preferScreenshare = false,
  omitPausedVideo = false,
  omitAudioOnly = false,
  omitExtraScreenshares = false,
}) {
  const activeVideoObj = useActiveVideo({
    maxCamStreams,
    preferScreenshare,
    omitPaused: omitPausedVideo,
    omitExtraScreenshares,
  });

  const audioOnlyPeers = useAudioOnlyPeers();

  return React.useMemo(() => {
    const {
      activeIds,
      activeScreenshareIds,
      dominantId,
      displayNamesById,
      pausedById,
      frameSizesById,
    } = activeVideoObj;

    let items = activeIds.map((videoId, i) => {
      return {
        index: i,
        key: 'video_' + i,
        isAudioOnly: false,
        isScreenshare: activeScreenshareIds.includes(videoId),
        videoId,
        displayName: displayNamesById[videoId] || '',
        highlighted: videoId === dominantId,
        paused: pausedById[videoId],
        frameSize: frameSizesById[videoId] || { w: 0, h: 0 },
      };
    });

    if (!omitAudioOnly && audioOnlyPeers.length > 0) {
      items = items.concat(
        audioOnlyPeers.map((peer, i) => {
          return {
            index: items.length + i,
            key: 'audioOnly_' + i,
            isAudioOnly: true,
            isScreenshare: false,
            videoId: null,
            displayName: peer.displayName || 'Audio participant',
            highlighted: false,
            paused: peer.audio.paused,
            dominant: peer.audio.dominant,
          };
        })
      );
    }

    return {
      participantDescs: items,
      dominantVideoId: dominantId,
      hasScreenShare: activeScreenshareIds.length > 0,
    };
  }, [activeVideoObj, audioOnlyPeers, omitAudioOnly]);
}
