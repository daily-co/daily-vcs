import * as React from 'react';
import { Box, Video } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PositionEdge } from '../constants.js';
import { ParticipantLabelPipStyle } from './ParticipantLabelPipStyle.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';
import VideoSingle from './VideoSingle.js';

const DOMINANT_SPLIT_DEFAULT = 0.8;
const DOMINANT_MAXITEMS_DEFAULT = 5;

export default function VideoDominant(props) {
  let {
    showLabels,
    scaleMode,
    videoStyle,
    videoLabelStyle,
    placeholderStyle,
    positionEdge = PositionEdge.LEFT,
    splitPos = DOMINANT_SPLIT_DEFAULT,
    maxItems = DOMINANT_MAXITEMS_DEFAULT,
    labelsOffset_px,
    participantDescs,
    dominantVideoId,
    followDominantFlag = true,
    itemInterval_gu = 0.7,
    outerPadding_gu = 0.5,
    splitMargin_gu = 0,
    disableRoundedCornersOnMain = false,
  } = props;

  itemInterval_gu = Math.max(0, itemInterval_gu);
  outerPadding_gu = Math.max(0, outerPadding_gu);

  if (
    (!followDominantFlag || !dominantVideoId) &&
    participantDescs.length > 0
  ) {
    dominantVideoId = participantDescs[0].videoId;
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
    const key = 'videodominant_item' + itemIdx;

    const participant = participantDescs.find(
      (d) => d.videoId != null && d.videoId == dominantVideoId
    );

    return (
      <Box
        key={key}
        id={key}
        layout={[
          mainLayoutFn,
          { index: itemIdx, pos: splitPos, margin_gu: splitMargin_gu },
        ]}
      >
        <VideoSingle
          enableParticipantOverride={true}
          overrideParticipant={participant}
          disableRoundedCorners={disableRoundedCornersOnMain}
          {...props}
        />
      </Box>
    );
  }

  function makeChiclets(itemIdx) {
    const key = 'videodominant_tiles_' + itemIdx;

    let pArr = participantDescs.filter(
      (d) => d.videoId == null || d.videoId !== dominantVideoId
    );
    if (pArr.length > maxItems) {
      pArr = pArr.slice(0, maxItems);
    }

    const items = [];
    for (let i = 0; i < pArr.length; i++) {
      const { videoId, paused, displayName } = pArr[i];
      const key = 'videochiclet_' + pArr[i].key;

      const layout = [
        layoutFuncs.column,
        {
          index: i,
          total: maxItems,
          makeRow: chicletsIsRow,
          innerMargin_gu: itemInterval_gu,
          outerMargin_gu: outerPadding_gu,
        },
      ];
      items.push(
        paused || videoId == null ? (
          <PausedPlaceholder
            key={key}
            layout={layout}
            {...{ placeholderStyle }}
          />
        ) : (
          <Video
            key={key}
            src={videoId}
            style={videoStyle}
            layout={layout}
            scaleMode={scaleMode}
          />
        )
      );
      if (showLabels) {
        items.push(
          <ParticipantLabelPipStyle
            key={key + '_label'}
            label={displayName}
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
