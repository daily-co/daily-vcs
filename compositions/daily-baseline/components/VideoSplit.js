import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import { useActiveVideo } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';

export default function VideoSplit({
  showLabels,
  scaleMode,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
  labelsOffset_px,
  preferScreenshare,
}) {
  const { activeIds, displayNamesById, pausedById } = useActiveVideo({
    preferScreenshare,
  });

  if (
    !labelsOffset_px ||
    !Number.isFinite(labelsOffset_px.x) ||
    !Number.isFinite(labelsOffset_px.y)
  ) {
    labelsOffset_px = { x: 0, y: 0 };
  }
  // this is the default offset for split mode
  labelsOffset_px.x += 10;
  labelsOffset_px.y += 10;

  function makeItem(itemIdx) {
    const key = 'videosplit_item' + itemIdx;
    const videoId = activeIds.length > itemIdx ? activeIds[itemIdx] : null;

    let content;
    if (videoId === null || pausedById[videoId]) {
      // show a placeholder
      content = <PausedPlaceholder {...{ placeholderStyle }} />;
    } else {
      // render video with optional label
      let participantLabel;
      if (showLabels) {
        participantLabel = (
          <Text
            key={key + '_label'}
            style={videoLabelStyle}
            layout={[layoutFuncs.offset, labelsOffset_px]}
          >
            {displayNamesById[videoId] || ''}
          </Text>
        );
      }

      content = [
        <Video
          key={key + '_video'}
          src={videoId}
          style={videoStyle}
          scaleMode={scaleMode}
        />,
        participantLabel,
      ];
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.splitAcrossLongerDimension, { index: itemIdx }]}
      >
        {content}
      </Box>
    );
  }

  return <Box id="videosplit">{[makeItem(0), makeItem(1)]}</Box>;
}
