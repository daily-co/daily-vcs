import * as React from 'react';
import { Box, Video, Label } from '#vcs-react/components';
import { useActiveVideo } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts';

export default function VideoSplit({
  showLabels,
  scaleMode,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
}) {
  const { activeIds, displayNamesById } = useActiveVideo();

  function makeItem(itemIdx) {
    const key = 'videosplit_item' + itemIdx;
    const videoId = activeIds.length > itemIdx ? activeIds[itemIdx] : null;

    let content;
    if (videoId === null) {
      // show a placeholder
      content = <Box style={placeholderStyle} />;
    } else {
      // render video with optional label
      let participantLabel;
      if (showLabels) {
        participantLabel = (
          <Label
            key={key + '_label'}
            style={videoLabelStyle}
            layout={[layoutFuncs.offset, { x: 10, y: 10 }]}
          >
            {displayNamesById[videoId] || ''}
          </Label>
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
        layout={[layoutFuncs.splitVertical, { index: itemIdx }]}
      >
        {content}
      </Box>
    );
  }

  return <Box id="videosplit">{[makeItem(0), makeItem(1)]}</Box>;
}
