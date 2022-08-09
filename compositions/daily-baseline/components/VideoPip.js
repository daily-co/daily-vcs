import * as React from 'react';
import { Box, Video } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PositionCorner } from '../constants.js';
import { ParticipantLabelPipStyle } from './ParticipantLabelPipStyle.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';
import VideoSingle from './VideoSingle.js';

export default function VideoPip(props) {
  const {
    scaleMode,
    videoStyle,
    videoLabelStyle,
    placeholderStyle,
    showLabels,
    positionCorner = PositionCorner.TOP_RIGHT,
    aspectRatio = 1,
    height_gu = 12,
    margin_gu = 1.5,
    labelsOffset_px = 0,
    participantDescs,
    dominantVideoId,
    followDominantFlag,
  } = props;

  let firstParticipant = participantDescs[0];

  if (followDominantFlag && dominantVideoId) {
    firstParticipant = participantDescs.find(
      (d) => d.videoId != null && d.videoId == dominantVideoId
    );
  }

  let otherParticipants = participantDescs.filter(
    (d) => d !== firstParticipant || firstParticipant == null
  );

  const items = [];

  items.push(
    <VideoSingle
      key="pipbase"
      enableParticipantOverride={true}
      overrideParticipant={firstParticipant}
      {...props}
    />
  );

  if (otherParticipants.length > 0) {
    // render second video inside PiP window
    const { videoId, displayName = '', paused } = otherParticipants[0];
    const key = 'pipwindow_' + videoId;

    const layoutProps = {
      positionCorner,
      aspectRatio,
      height_gu,
      margin_gu,
    };
    const layout = [layoutFuncs.pip, layoutProps];

    items.push(
      paused || videoId == null ? (
        <PausedPlaceholder
          key={key + '_video_paused'}
          {...{ layout, placeholderStyle }}
        />
      ) : (
        <Video
          key={key + '_video'}
          src={videoId}
          style={videoStyle}
          scaleMode="fill"
          layout={layout}
        />
      )
    );

    if (showLabels) {
      items.push(
        <ParticipantLabelPipStyle
          key={key + '_label_' + displayName}
          label={displayName}
          labelStyle={videoLabelStyle}
          labelsOffset_px={labelsOffset_px}
          layout={layout}
        />
      );
    }
  }

  return <Box id="videopip">{items}</Box>;
}
