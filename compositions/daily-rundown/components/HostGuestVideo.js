import * as React from 'react';
import { Box, Video } from '#vcs-react/components';
import * as layouts from '../layouts.js';
import ParticipantLabel from './ParticipantLabel.js';

export default function HostGuestVideo({
  activeIds = [],
  guestNameOverride = '',
  participantLabelStyle,
}) {
  if (activeIds.length < 1) {
    return null;
  } else if (activeIds.length === 1) {
    return <Video src={activeIds[0]}></Video>;
  }

  const hostId = activeIds[0];
  const hostSplitPos = 0.6;

  let guestView;
  if (activeIds.length < 3) {
    // single guest
    const guestId = activeIds[1];
    if (guestNameOverride.length > 0) {
      guestView = (
        <>
          <Video src={guestId} />
          <ParticipantLabel
            name={guestNameOverride}
            style={participantLabelStyle}
          />
        </>
      );
    } else {
      guestView = <Video src={guestId} />;
    }
  } else {
    // multiple guests; show the first two by default
    const guestId1 = activeIds[1];
    const guestId2 = activeIds[2];
    const guestSplitPos = 0.5;

    // currently we're not showing participant labels for guests in this mode
    // since we only have one 'guestNameOverride' param.
    // should get the displayName values from the video inputs and use those.

    guestView = (
      <>
        <Video
          src={guestId1}
          key={`guest_${guestId1}`}
          layout={[layouts.splitVertical, { index: 0, pos: guestSplitPos }]}
        />
        <Video
          src={guestId2}
          key={`guest_${guestId2}`}
          layout={[layouts.splitVertical, { index: 1, pos: guestSplitPos }]}
        />
      </>
    );
  }

  return (
    <Box>
      <Video
        src={hostId}
        key="host"
        layout={[layouts.splitHorizontal, { index: 0, pos: hostSplitPos }]}
      ></Video>
      <Box
        key="guests"
        layout={[layouts.splitHorizontal, { index: 1, pos: hostSplitPos }]}
      >
        {guestView}
      </Box>
    </Box>
  );
}
