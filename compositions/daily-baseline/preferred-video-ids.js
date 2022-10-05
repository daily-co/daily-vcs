import * as React from 'react';
import { RoomContext } from '#vcs-react/contexts';

export function usePreferredParticipantIdsParam(params) {
  const { availablePeers } = React.useContext(RoomContext);

  // allow user to pass a comma-separated list of peer ids as a string.
  // check if these peers are present in the room, and collect their video ids.
  // the caller is responsible for actually sorting its video inputs list
  // according to the array we return.
  const preferredParticipantIdsStr =
    params['videoSettings.preferredParticipantIds'];

  const preferredVideoIds = React.useMemo(() => {
    const wantedIds = parseCommaSeparatedList(preferredParticipantIdsStr);
    const arr = [];
    for (const wantedId of wantedIds) {
      const p = availablePeers.find((p) => p.id === wantedId);
      if (p) {
        arr.push(p.video.id || p.screenshareVideo.id);
      }
    }
    return arr;
  }, [availablePeers, preferredParticipantIdsStr]);

  // provided here as an override point if someone doesn't want this behavior
  const includeOtherVideoIds = true;

  return { preferredVideoIds, includeOtherVideoIds };
}

function parseCommaSeparatedList(str) {
  if (!str || str.length < 1) return [];

  return str.split(',').map((s) => s.trim());
}
