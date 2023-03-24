import * as React from 'react';
import HostGuestVideo from './HostGuestVideo.js';

/*
  This container component is provided as an override point.

  In case you want to replace the video rendering,
  replace this file with your own code using the Daily session assets API.

  You could e.g. render a grid using the layout available in VCS stdlib/layouts.
*/

export default function VideoContainer({
  activeIds,
  participantLabelStyle,
  guestNameOverride,
}) {
  return (
    <HostGuestVideo
      {...{ activeIds, participantLabelStyle, guestNameOverride }}
    />
  );
}
