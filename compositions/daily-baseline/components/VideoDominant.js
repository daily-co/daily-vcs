import * as React from 'react';
import { Box, Video, Label } from '#vcs-react/components';
import { useActiveVideo } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts';

const DOMINANT_SPLIT_PROP = 0.8;

export default function VideoDominant({
  showLabels,
  scaleMode,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
  dominantOnLeft,
}) {
  const { activeIds, activeScreenshareIds, dominantId } = useActiveVideo();

  const splitPos = dominantOnLeft
    ? DOMINANT_SPLIT_PROP
    : 1 - DOMINANT_SPLIT_PROP;

  function makeDominantItem(itemIdx) {
    const key = 'videodominant_' + itemIdx;
    const videoId = dominantId;

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
            {`Video input id ${videoId}`}
          </Label>
        );
      }

      // TODO: get the real video aspect ratio
      const contentAspectRatio = 16 / 9;

      content = [
        <Video
          key={key + '_video'}
          src={videoId}
          style={videoStyle}
          layout={[layoutFuncs.fit, { contentAspectRatio }]}
          scaleMode={scaleMode}
        />,
        participantLabel,
      ];
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.splitVertical, { index: itemIdx, pos: splitPos }]}
      >
        {content}
      </Box>
    );
  }

  function makeTileColumn(itemIdx) {
    const key = 'videodominant_tiles_' + itemIdx;

    let videoIds = activeIds.filter((id) => id !== dominantId);
    const maxItems = 5;
    if (videoIds.length > maxItems) {
      videoIds = videoIds.slice(0, maxItems);
    }

    const items = [];
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      items.push(
        <Video
          key={videoId}
          src={videoId}
          style={videoStyle}
          layout={[layoutFuncs.column, { index: i, total: maxItems }]}
        />
      );
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.splitVertical, { index: itemIdx, pos: splitPos }]}
      >
        {items}
      </Box>
    );
  }

  const topItems = dominantOnLeft
    ? [makeDominantItem(0), makeTileColumn(1)]
    : [makeTileColumn(0), makeDominantItem(1)];

  return <Box id="videodominant">{topItems}</Box>;
}
