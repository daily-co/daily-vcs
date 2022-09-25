import * as React from 'react';
import { Box, Video, Text } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';

export default function VideoGrid({
  showLabels,
  scaleMode,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
  labelsOffset_px = 0,
  participantDescs,
  highlightDominant = true,
  itemInterval_gu = -1,
  outerPadding_gu = -1,
}) {
  const totalNumItems = participantDescs.length;
  itemInterval_gu = Math.max(-1, itemInterval_gu);
  outerPadding_gu = Math.max(-1, outerPadding_gu);

  function makeItem({
    index,
    key,
    isAudioOnly,
    videoId,
    displayName,
    highlighted,
    paused,
  }) {
    key = 'videogriditem_' + key;

    const itemLayout = [
      layoutFuncs.grid,
      {
        index,
        total: totalNumItems,
        innerMargin_gu: itemInterval_gu,
        outerMargin_gu: outerPadding_gu,
      },
    ];

    let participantLabel;
    if (showLabels) {
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
    if (highlighted) {
      const highlightStyle = {
        strokeColor: '#fff',
        strokeWidth_px: 4,
        cornerRadius_px: videoStyle.cornerRadius_px,
      };

      highlight = (
        <Box
          style={highlightStyle}
          layout={itemLayout}
          key={key + '_highlight'}
        />
      );
    }

    let video;
    if (isAudioOnly || paused) {
      video = <PausedPlaceholder {...{ placeholderStyle }} />;
    } else {
      video = <Video src={videoId} style={videoStyle} scaleMode={scaleMode} />;
    }

    const item = (
      <Box key={key} id={key} layout={itemLayout}>
        {video}
        {participantLabel}
      </Box>
    );

    // the highlight needs to be separate from the video box
    // to prevent the stroke from getting clipped.
    // always return an array so the item component keeps in place
    // in React's diffing.
    return highlightDominant && highlight ? [item, highlight] : [item];
  }

  return <Box id="videogrid">{participantDescs.map((d) => makeItem(d))}</Box>;
}
