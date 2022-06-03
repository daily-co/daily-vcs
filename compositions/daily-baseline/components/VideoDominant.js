import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import { useActiveVideo } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';
import { PositionEdge } from '../constants.js';
import { ParticipantLabelPipStyle } from './ParticipantLabelPipStyle.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';

const DOMINANT_SPLIT_DEFAULT = 0.8;
const DOMINANT_MAXITEMS_DEFAULT = 5;

export default function VideoDominant({
  showLabels,
  scaleMode,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
  positionEdge = PositionEdge.LEFT,
  splitPos = DOMINANT_SPLIT_DEFAULT,
  maxItems = DOMINANT_MAXITEMS_DEFAULT,
  labelsOffset_px,
  followDominantFlag,
  preferScreenshare,
}) {
  let { activeIds, dominantId, displayNamesById, pausedById } = useActiveVideo({
    preferScreenshare,
  });

  if (!followDominantFlag || !dominantId) {
    dominantId = activeIds[0];
  }

  const dominantFirst =
    positionEdge === PositionEdge.LEFT || positionEdge === PositionEdge.TOP;
  const isVerticalSplit =
    positionEdge === PositionEdge.LEFT || positionEdge === PositionEdge.RIGHT;

  if (!dominantFirst) {
    splitPos = 1 - splitPos;
  }

  let mainLayoutFn, chicletsIsRow;
  if (isVerticalSplit) {
    mainLayoutFn = layoutFuncs.splitVertical;
    chicletsIsRow = false;
  } else {
    mainLayoutFn = layoutFuncs.splitHorizontal;
    chicletsIsRow = true;
  }

  function makeDominantItem(itemIdx) {
    const key = 'videodominant_' + itemIdx;
    const videoId = dominantId;

    let content;
    if (videoId === null || pausedById[videoId]) {
      // show a placeholder
      content = <PausedPlaceholder {...{ placeholderStyle }} />;
    } else {
      // render video with optional label
      content = [
        <Video
          key={key + '_video'}
          src={videoId}
          style={videoStyle}
          scaleMode={scaleMode}
        />,
      ];
      if (showLabels) {
        content.push(
          <ParticipantLabelPipStyle
            key={key + '_label'}
            label={displayNamesById[videoId]}
            labelStyle={videoLabelStyle}
            labelsOffset_px={labelsOffset_px}
          />
        );
      }
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[mainLayoutFn, { index: itemIdx, pos: splitPos }]}
      >
        {content}
      </Box>
    );
  }

  function makeChiclets(itemIdx) {
    const key = 'videodominant_tiles_' + itemIdx;

    let videoIds = activeIds.filter((id) => id !== dominantId);
    if (videoIds.length > maxItems) {
      videoIds = videoIds.slice(0, maxItems);
    }

    const items = [];
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      const layout = [
        layoutFuncs.column,
        { index: i, total: maxItems, makeRow: chicletsIsRow },
      ];
      items.push(
        pausedById[videoId] ? (
          <PausedPlaceholder
            key={videoId}
            layout={layout}
            {...{ placeholderStyle }}
          />
        ) : (
          <Video
            key={videoId}
            src={videoId}
            style={videoStyle}
            layout={layout}
          />
        )
      );
      if (showLabels) {
        items.push(
          <ParticipantLabelPipStyle
            key={videoId + '_label'}
            label={displayNamesById[videoId]}
            labelStyle={videoLabelStyle}
            labelsOffset_px={labelsOffset_px}
            layout={layout}
          />
        );
      }
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[mainLayoutFn, { index: itemIdx, pos: splitPos }]}
      >
        {items}
      </Box>
    );
  }

  const topItems = dominantFirst
    ? [makeDominantItem(0), makeChiclets(1)]
    : [makeChiclets(0), makeDominantItem(1)];

  return <Box id="videodominant">{topItems}</Box>;
}
