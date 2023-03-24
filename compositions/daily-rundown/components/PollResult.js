import * as React from 'react';
import { Box, Image, Text } from '#vcs-react/components';
import { useVideoTime, useViewportSize } from '#vcs-react/hooks';
import * as layouts from '../layouts.js';

export default function PollResult({
  question,
  totalVotes,
  yesVotes,
  layout,
  titleStyle = {},
}) {
  const bgStyle = {
    fillColor: 'rgb(120, 0, 0)',
  };
  const yesStyle = {
    fillColor: 'rgb(50, 150, 70)',
  };
  const questionStyle = {
    ...titleStyle,
    textColor: 'white',
    textAlign: 'center',
    fontSize_gu: titleStyle.fontSize_gu ? titleStyle.fontSize_gu * 0.75 : 1.3,
  };
  const voteInfoStyle = {
    ...titleStyle,
    textColor: 'white',
    textAlign: 'center',
    fontSize_gu: 1.7,
    strokeWidth_px: 2,
    strokeColor: 'rgba(0, 0, 0, 0.6)',
  };

  let resultGraphic;

  if (totalVotes < 1 || !Number.isFinite(totalVotes)) {
    resultGraphic = null;
  } else {
    const prop = Math.min(1, yesVotes / totalVotes);
    const maxH_gu = 4;

    resultGraphic = (
      <Box layout={[layouts.pad, { pad_gu: { b: 3 } }]}>
        <Box
          style={bgStyle}
          layout={[layouts.horizontalBar, { proportionalSize: 1, maxH_gu }]}
        >
          <Box
            style={yesStyle}
            layout={[
              layouts.horizontalBar,
              { proportionalSize: prop, maxH_gu },
            ]}
          />
        </Box>
        <Text
          style={voteInfoStyle}
          layout={[layouts.centerText, { offsetY_gu: 0.2 }]}
        >
          {(prop * 100).toFixed(1)} %
        </Text>
      </Box>
    );
  }

  const numItems = 2;

  return (
    <Box layout={layout}>
      <Box layout={[layouts.stackFixedRows, { index: 0, numItems }]}>
        <Text style={questionStyle} layout={[layouts.centerText]}>
          {question}
        </Text>
      </Box>
      <Box layout={[layouts.stackFixedRows, { index: 1, numItems }]}>
        {resultGraphic}
      </Box>
    </Box>
  );
}
