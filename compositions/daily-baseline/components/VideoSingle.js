import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';
import decorateVideoSingleItem from './overrides/decorateVideoSingleItem.js';
import { DEFAULT_OFFSET_VIDEO_SINGLE_PX } from '../constants.js';

export default function VideoSingle(props) {
  let {
    showLabels,
    scaleMode,
    scaleModeForScreenshare,
    videoStyle,
    videoLabelStyle,
    placeholderStyle,
    labelsOffset_px,
    participantDescs,
    enableParticipantOverride,
    overrideParticipant,
    disableRoundedCorners = false,
    overrideDecoration,
    zoomFactor = 1,
  } = props;

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
    x: DEFAULT_OFFSET_VIDEO_SINGLE_PX + labelsOffset_px.x,
    y: DEFAULT_OFFSET_VIDEO_SINGLE_PX + labelsOffset_px.y,
  };

  const d = enableParticipantOverride
    ? overrideParticipant
    : participantDescs.length > 0
    ? participantDescs[0]
    : null;
  const { videoId, paused, isScreenshare, displayName = '' } = d || {};

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

  // override point for custom decorations on grid items.
  // the decoration can also be passed from the outside in `overrideDecoration`;
  // this is used by components like VideoPip that do part of their rendering
  // using VideoSingle.
  const {
    enableDefaultLabels = true,
    customComponent: customDecoratorComponent,
    clipItem = false,
    customLayoutForVideo,
  } = overrideDecoration || decorateVideoSingleItem(d, props);

  if (!customDecoratorComponent && videoId == null && displayName.length < 1) {
    // nothing to render even for a placeholder, so just render background color
    return <Box key="emptyPlaceholder" style={placeholderStyle} />;
  }

  let participantLabel;
  if (enableDefaultLabels && showLabels && displayName.length > 0) {
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
      <PausedPlaceholder
        key="pausedPlaceholder"
        layout={customLayoutForVideo}
        {...{ placeholderStyle }}
      />
    );
  } else {
    content = (
      <Video
        key="video"
        src={videoId}
        style={videoStyle}
        scaleMode={isScreenshare ? scaleModeForScreenshare : scaleMode}
        layout={customLayoutForVideo}
        zoom={zoomFactor}
      />
    );
  }

  const arr = [content];
  if (participantLabel) arr.push(participantLabel);
  if (customDecoratorComponent) arr.push(customDecoratorComponent);

  return clipItem ? (
    <Box
      clip
      style={{
        cornerRadius_px: videoStyle.cornerRadius_px,
      }}
    >
      {arr}
    </Box>
  ) : (
    arr
  );
}
