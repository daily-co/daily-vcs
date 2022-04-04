import * as React from 'react';
import { Box, Video, Label } from '#vcs-react/components';
import { useActiveVideo } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';
import { ParticipantLabelPipStyle } from './ParticipantLabelPipStyle.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';

export default function VideoPip({
  scaleMode,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
  showLabels,
  positionCorner,
  aspectRatio,
  height_vh,
  margin_vh,
  labelsOffset_px,
  followDominantFlag,
}) {
  const { activeIds, dominantId, displayNamesById, pausedById } =
    useActiveVideo();

  let firstVideoId = activeIds[0];
  if (followDominantFlag && dominantId) {
    firstVideoId = dominantId;
  }

  let otherVideoIds = activeIds.filter((id) => id !== firstVideoId);

  const items = [];

  if (!firstVideoId) {
    // if nobody is active, show a placeholder
    items.push(<Box style={placeholderStyle} />);
  } else {
    // render video with optional label
    const videoId = firstVideoId;
    const key = 0;

    items.push(
      pausedById[videoId] ? (
        <PausedPlaceholder
          key={key + '_video_paused'}
          {...{ placeholderStyle }}
        />
      ) : (
        <Video key={key + '_video'} src={videoId} scaleMode={scaleMode} />
      )
    );

    if (showLabels) {
      items.push(
        <ParticipantLabelPipStyle
          key={key + '_label'}
          label={displayNamesById[videoId]}
          labelStyle={videoLabelStyle}
          labelsOffset_px={labelsOffset_px}
        />
      );
    }
  }

  if (otherVideoIds.length > 0) {
    // render second video inside PiP window
    const videoId = otherVideoIds[0];
    const key = 1;

    const layoutProps = {
      positionCorner,
      aspectRatio,
      height_vh,
      margin_vh,
    };
    const layout = [layoutFuncs.pip, layoutProps];

    items.push(
      pausedById[videoId] ? (
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
          key={key + '_label'}
          label={displayNamesById[videoId]}
          labelStyle={videoLabelStyle}
          labelsOffset_px={labelsOffset_px}
          layout={layout}
        />
      );
    }
  }

  return <Box id="videopip">{items}</Box>;
}
