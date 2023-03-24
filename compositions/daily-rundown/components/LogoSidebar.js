import * as React from 'react';
import { Box, Image, Text } from '#vcs-react/components';
import { useVideoTime, useViewportSize } from '#vcs-react/hooks';
import * as layouts from '../layouts.js';
import PollResult from './PollResult.js';

export default function LogoSidebar({
  logoAssetName,
  useTitle,
  title,
  titleStyle = {},
  pollData = {},
}) {
  let logo, pollResult;
  let splitPos = 1;

  if (!useTitle) {
    logo = (
      <Image
        src={
          logoAssetName && logoAssetName.length > 0 ? logoAssetName : 'logo.png'
        }
      />
    );
  } else {
    logo = (
      <Text
        style={{ ...titleStyle, textAlign: 'center' }}
        layout={[layouts.centerText]}
      >
        {title}
      </Text>
    );
  }

  if (pollData.showResult) {
    splitPos = 0.5;
    const noVotes = parseInt(pollData.noVotes, 10) || 0;
    const yesVotes = parseInt(pollData.yesVotes, 10) || 0;
    pollResult = (
      <PollResult
        totalVotes={noVotes + yesVotes}
        yesVotes={yesVotes}
        layout={[layouts.splitHorizontal, { pos: splitPos, index: 1 }]}
        titleStyle={titleStyle}
        question={pollData.question}
      />
    );
  }

  return (
    <Box layout={[layouts.pad, { pad_gu: 0.5 }]}>
      <Box layout={[layouts.splitHorizontal, { pos: splitPos, index: 0 }]}>
        {logo}
      </Box>
      {pollResult}
    </Box>
  );
}
