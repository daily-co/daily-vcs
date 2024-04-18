import * as React from 'react';
import { Box, Video } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PositionCorner } from '../constants.js';
import { ParticipantLabelPipStyle } from './ParticipantLabelPipStyle.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';
import VideoSingle from './VideoSingle.js';
import decorateVideoPipItem from './overrides/decorateVideoPipItem.js';

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
    preferScreenshare,
    disableRoundedCornersOnMain = false,
  } = props;

  let firstParticipant = participantDescs[0];
  let otherParticipants;

  if (followDominantFlag && dominantVideoId) {
    const participantWithDomFlag = participantDescs.find(
      (d) => d.videoId != null && d.videoId == dominantVideoId
    );

    const hasDominantScreenshare =
      preferScreenshare && firstParticipant && firstParticipant.isScreenshare;

    if (
      hasDominantScreenshare &&
      participantWithDomFlag &&
      !participantWithDomFlag.isScreenshare
    ) {
      // if we have a dominant screenshare, it takes precedence,
      // so put the dominant-flagged video into the PiP instead
      otherParticipants = [participantWithDomFlag];
    } else {
      firstParticipant = participantWithDomFlag;
    }
  }

  if (!otherParticipants) {
    otherParticipants = participantDescs.filter(
      (d) => d !== firstParticipant || firstParticipant == null
    );
  }

  const mainVideoSingleProps = {
    ...props,
    enableParticipantOverride: true,
    overrideParticipant: firstParticipant,
    disableRoundedCorners: disableRoundedCornersOnMain,
  };

  // override point #1 for custom decorations on pip videos.
  // we use a VideoSingle component to actually render the main video.
  // the shape of the object here is compatible with the override point
  // in VideoSingle, so we just pass this object to the component from the outside.
  const mainDecoration = decorateVideoPipItem(
    0,
    firstParticipant,
    mainVideoSingleProps
  );

  let items = [];

  items.push(
    <VideoSingle
      key="pipbase"
      overrideDecoration={mainDecoration}
      {...mainVideoSingleProps}
    />
  );

  if (otherParticipants.length > 0) {
    // render second video inside PiP window
    const pipParticipant = otherParticipants[0];
    const { videoId, displayName = '', paused } = pipParticipant;
    const key = 'pipwindow_' + videoId;

    const layoutProps = {
      positionCorner,
      aspectRatio,
      height_gu,
      margin_gu,
    };
    const layout = [layoutFuncs.pip, layoutProps];

    // override point #2 for custom decorations on pip videos
    const {
      enableDefaultLabels = true,
      customComponent: customDecoratorComponent,
      clipItem = false,
      customLayoutForVideo,
    } = decorateVideoPipItem(1, pipParticipant, props);

    const pipItems = [];

    pipItems.push(
      paused || videoId == null ? (
        <PausedPlaceholder
          key={key + '_video_paused'}
          layout={customLayoutForVideo}
          {...{ placeholderStyle }}
        />
      ) : (
        <Video
          key={key + '_video'}
          src={videoId}
          style={videoStyle}
          scaleMode="fill"
          layout={customLayoutForVideo}
        />
      )
    );

    if (enableDefaultLabels && showLabels) {
      pipItems.push(
        <ParticipantLabelPipStyle
          key={key + '_label_' + displayName}
          label={displayName}
          labelStyle={videoLabelStyle}
          labelsOffset_px={labelsOffset_px}
        />
      );
    }

    if (customDecoratorComponent) {
      pipItems.push(
        <Box key={key + '_pipcustomdeco'}>{customDecoratorComponent}</Box>
      );
    }

    const containerStyle = clipItem
      ? {
          cornerRadius_px: videoStyle.cornerRadius_px,
        }
      : null;

    items.push(
      <Box
        key={key + '_pipcontainer'}
        clip={clipItem}
        style={containerStyle}
        layout={layout}
      >
        {pipItems}
      </Box>
    );
  }

  return <Box id="videopip">{items}</Box>;
}
