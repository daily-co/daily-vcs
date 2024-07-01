import * as React from 'react';
import {
  useActiveVideo,
  useAudioOnlyPeers,
  useUnpausedPeers,
} from '#vcs-react/hooks';

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
  filterForUnpausedMediaTypes = '',
}) {
  const activeVideoObj = useActiveVideo({
    maxCamStreams,
    preferScreenshare,
    omitPaused: omitPausedVideo,
    omitExtraScreenshares,
  });

  const audioOnlyPeers = useAudioOnlyPeers();
  const unpausedPeers = useUnpausedPeers(filterForUnpausedMediaTypes);

  return React.useMemo(() => {
    const {
      activeIds,
      activeScreenshareIds,
      dominantId,
      displayNamesById,
      pausedById,
      frameSizesById,
    } = activeVideoObj;

    let filteredActiveIds = activeIds;

    if (filterForUnpausedMediaTypes?.length > 0) {
      // when this filter is active, only allow video inputs to be included
      // if the participant had unpaused media of the specified type(s).
      //
      // e.g. passing "audio,screenshare" to `filterForUnpausedMediaTypes`
      // would result in a filter that shows the participant's content only
      // if either their audio or screenshare is not paused.
      //
      // however! this filter just selects participants, it doesn't remove video tracks.
      // so if (in the above example) the participant did have both a video and screenshare
      // track, both would be included by this filter, as long as screenshare is not paused.
      // further filtering is needed to omit a specific track (e.g. omitPaused).
      //
      filteredActiveIds = activeIds.filter((videoId) => {
        return (
          unpausedPeers.find((peer) => {
            return (
              peer.video?.id === videoId ||
              peer.screenshareVideo?.id === videoId
            );
          }) !== undefined
        );
      });

      if (!omitAudioOnly) {
        // check if the filter allows audio-only participants
        const allowedTypes = filterForUnpausedMediaTypes
          .split(',')
          .map((s) => s.trim());
        omitAudioOnly = !allowedTypes.includes('audio');
      }
    }

    let items = filteredActiveIds.map((videoId, i) => {
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
            highlighted: peer.audio.dominant,
            paused: peer.audio.paused,
          };
        })
      );
    }

    return {
      participantDescs: items,
      dominantVideoId: dominantId,
      hasScreenShare: activeScreenshareIds.length > 0,
    };
  }, [activeVideoObj, audioOnlyPeers, unpausedPeers, omitAudioOnly]);
}
