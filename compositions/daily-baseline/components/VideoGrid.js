import * as React from 'react';
import { Box, Video, Label } from '#vcs-react/components';
import { useActiveVideo } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts';
import { DEFAULT_LABEL_FONT_SIZE_PX } from '../constants';

export default function VideoGrid({
  showLabels,
  scaleMode,
  videoStyle,
  videoLabelStyle,
}) {
  const { activeIds, displayNamesById } = useActiveVideo();

  const items = activeIds.map((videoId, i) => {
    const key = 'videogrid_item' + i;
    let participantLabel;
    if (showLabels && activeIds.length > 1) {
      participantLabel = (
        <Label
          style={videoLabelStyle}
          layout={[
            layoutFuncs.offset,
            { y: -Math.round(DEFAULT_LABEL_FONT_SIZE_PX / 2) },
          ]}
        >
          {displayNamesById[videoId] || ''}
        </Label>
      );
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.grid, { index: i, total: activeIds.length }]}
      >
        <Video src={videoId} style={videoStyle} scaleMode={scaleMode} />
        {participantLabel}
      </Box>
    );
  });

  return <Box id="videogrid">{items}</Box>;
}
