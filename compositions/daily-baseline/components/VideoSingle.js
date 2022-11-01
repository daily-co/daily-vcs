import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';

export default function VideoSingle({
  showLabels,
  scaleMode,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
  labelsOffset_px,
  participantDescs,
  enableParticipantOverride,
  overrideParticipant,
  disableRoundedCorners = false,
}) {
  if (
    !labelsOffset_px ||
    !Number.isFinite(labelsOffset_px.x) ||
    !Number.isFinite(labelsOffset_px.y)
  ) {
    labelsOffset_px = { x: 0, y: 0 };
  }
  // apply a default offset in this mode so the offset comp param
  // behaves more predictably when the mode param is switched
  const offsets = {
    x: 10 + labelsOffset_px.x,
    y: 10 + labelsOffset_px.y,
  };

  const d = enableParticipantOverride
    ? overrideParticipant
    : participantDescs.length > 0
    ? participantDescs[0]
    : null;
  const { videoId, paused, displayName = '' } = d || {};

  if (disableRoundedCorners) {
    if (videoStyle && videoStyle.cornerRadius_px > 0) {
      videoStyle = {
        ...videoStyle,
        cornerRadius_px: 0,
      };
    }
    if (placeholderStyle && placeholderStyle.cornerRadius_px > 0) {
      placeholderStyle = {
        ...placeholderStyle,
        cornerRadius_px: 0,
      };
    }
  }

  if (videoId == null && displayName.length < 1) {
    // nothing to render even for a placeholder, so just render background color
    return <Box key="emptyPlaceholder" style={placeholderStyle} />;
  }

  let participantLabel;
  if (showLabels && displayName.length > 0) {
    participantLabel = (
      <Text
        key={'label_' + displayName}
        style={videoLabelStyle}
        layout={[layoutFuncs.offset, offsets]}
      >
        {displayName}
      </Text>
    );
  }

  let content;
  if (paused || videoId == null) {
    // no video available, show a placeholder with the icon
    content = (
      <PausedPlaceholder key="pausedPlaceholder" {...{ placeholderStyle }} />
    );
  } else {
    content = (
      <Video
        key="video"
        src={videoId}
        style={videoStyle}
        scaleMode={scaleMode}
      />
    );
  }

  return [content, participantLabel];
}
