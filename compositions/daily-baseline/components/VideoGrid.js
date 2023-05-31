import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';
import decorateVideoGridItem from './overrides/decorateVideoGridItem.js';

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

    const itemLayout = [
      layoutFuncs.grid,
      {
        index,
        total: totalNumItems,
        innerMargin_gu: itemInterval_gu,
        outerMargin_gu: outerPadding_gu,
        preserveItemAspectRatio,
      },
    ];

    // override point for custom decorations on grid items
    const {
      enableDefaultLabels = true,
      enableDefaultHighlight = true,
      customComponent: customDecoratorComponent,
      clipItem = false,
    } = decorateVideoGridItem(index, itemProps, gridProps);

    let participantLabel;
    if (enableDefaultLabels && showLabels) {
      participantLabel = (
        <Text
          style={videoLabelStyle}
          layout={[
            layoutFuncs.gridLabel,
            { textH: videoLabelStyle.fontSize_px, offsets: labelsOffset_px },
          ]}
          clip
        >
          {displayName}
        </Text>
      );
    }

    let highlight;
    if (enableDefaultHighlight && highlightDominant && highlighted) {
      const highlightStyle = {
        strokeColor: videoStyle.highlightColor,
        strokeWidth_px: videoStyle.highlightStrokeWidth_px,
        cornerRadius_px: videoStyle.cornerRadius_px,
      };

      highlight = <Box style={highlightStyle} key={key + '_highlight'} />;
    }

    let video;
    if (isAudioOnly || paused) {
      video = <PausedPlaceholder {...{ placeholderStyle }} />;
    } else {
      video = (
        <Video
          src={videoId}
          style={videoStyle}
          scaleMode={isScreenshare ? scaleModeForScreenshare : scaleMode}
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
