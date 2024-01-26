import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';
import decorateVideoGridItem from './overrides/decorateVideoGridItem.js';
import { DEFAULT_OFFSET_VIDEO_SINGLE_PX } from '../constants.js';

export default function VideoGrid(gridProps) {
  let {
    showLabels,
    scaleMode,
    scaleModeForScreenshare,
    videoStyle,
    videoLabelStyle,
    placeholderStyle,
    labelsOffset_px = 0,
    participantDescs,
    highlightDominant = true,
    itemInterval_gu = -1,
    outerPadding_gu = -1,
    preserveItemAspectRatio = true,
    fullScreenHighlightItemIndex = -1,
  } = gridProps;

  const totalNumItems = participantDescs.length;
  itemInterval_gu = Math.max(-1, itemInterval_gu);
  outerPadding_gu = Math.max(-1, outerPadding_gu);

  function makeItem(index, itemProps) {
    const {
      isAudioOnly,
      isScreenshare,
      videoId,
      displayName,
      highlighted,
      paused,
    } = itemProps;
    let key = 'videogriditem_' + index;

    let itemLayout;
    let videoBlend;

    if (fullScreenHighlightItemIndex >= 0) {
      // special full-screen highlight mode
      itemLayout = null;
      videoBlend = {
        opacity: fullScreenHighlightItemIndex === index ? 1 : 0,
      };
    } else {
      // default grid layout
      itemLayout = [
        layoutFuncs.grid,
        {
          index,
          total: totalNumItems,
          innerMargin_gu: itemInterval_gu,
          outerMargin_gu: outerPadding_gu,
          preserveItemAspectRatio,
        },
      ];
    }

    // override point for custom decorations on grid items
    const {
      enableDefaultLabels = true,
      enableDefaultHighlight = true,
      customComponent: customDecoratorComponent,
      clipItem = false,
      customLayoutForVideo,
    } = decorateVideoGridItem(index, itemProps, gridProps);

    let participantLabel;
    if (enableDefaultLabels && showLabels && displayName.length > 0) {
      // for a single participant, put the label inside the video frame like in VideoSingle.
      // the 10px offsets applied here for single mode are the same as VideoSingle.
      const isGrid = totalNumItems > 1;
      const labelLayout = isGrid ? layoutFuncs.gridLabel : layoutFuncs.offset;
      const offsets = isGrid
        ? labelsOffset_px
        : {
            x: DEFAULT_OFFSET_VIDEO_SINGLE_PX + labelsOffset_px.x,
            y: DEFAULT_OFFSET_VIDEO_SINGLE_PX + labelsOffset_px.y,
          };

      participantLabel = (
        <Text
          key={'label_' + displayName}
          style={videoLabelStyle}
          layout={[
            labelLayout,
            { textH: videoLabelStyle.fontSize_px, offsets },
          ]}
          clip
        >
          {displayName}
        </Text>
      );
    }

    const videoScaleMode = isScreenshare ? scaleModeForScreenshare : scaleMode;
    const hasLiveVideo = !isAudioOnly && !paused;

    let highlight;
    if (enableDefaultHighlight && highlightDominant && highlighted) {
      const highlightStyle = {
        strokeColor: videoStyle.highlightColor,
        strokeWidth_px: videoStyle.highlightStrokeWidth_px,
        cornerRadius_px: videoStyle.cornerRadius_px,
      };

      let highlightLayout;
      if (hasLiveVideo && videoScaleMode === 'fit') {
        const { frameSize } = itemProps;
        const aspectRatio =
          frameSize?.w > 0 && frameSize?.h > 0 ? frameSize.w / frameSize.h : 0;
        if (aspectRatio > 0) {
          highlightLayout = [
            layoutFuncs.fit,
            {
              contentAspectRatio: aspectRatio,
            },
          ];
        }
      }
      highlight = (
        <Box
          style={highlightStyle}
          key={key + '_highlight'}
          layout={highlightLayout}
        />
      );
    }

    let video;
    if (!hasLiveVideo) {
      video = (
        <PausedPlaceholder
          layout={customLayoutForVideo}
          {...{ placeholderStyle }}
        />
      );
    } else {
      video = (
        <Video
          src={videoId}
          style={videoStyle}
          scaleMode={videoScaleMode}
          layout={customLayoutForVideo}
          blend={videoBlend}
        />
      );
    }

    const containerStyle = clipItem
      ? {
          cornerRadius_px: videoStyle.cornerRadius_px,
        }
      : null;

    return (
      <Box
        key={key}
        id={key}
        layout={itemLayout}
        style={containerStyle}
        clip={clipItem}
      >
        {video}
        {participantLabel}
        {highlight}
        {customDecoratorComponent}
      </Box>
    );
  }

  return (
    <Box id="videogrid">
      {participantDescs.map((d, idx) => makeItem(idx, d))}
    </Box>
  );
}
