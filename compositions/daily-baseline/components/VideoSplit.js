import * as React from 'react';
import { Box } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import VideoSingle from './VideoSingle.js';

export default function VideoSplit(props) {
  const { participantDescs = [], margin_gu = 0 } = props;
  function makeItem(itemIdx) {
    const key = 'videosplit_item' + itemIdx;
    return (
      <Box
        key={key}
        id={key}
        layout={[
          layoutFuncs.splitAcrossLongerDimension,
          { index: itemIdx, margin_gu },
        ]}
      >
        <VideoSingle
          enableParticipantOverride={true}
          overrideParticipant={participantDescs[itemIdx]}
          {...props}
        />
      </Box>
    );
  }

  return <Box id="videosplit">{[makeItem(0), makeItem(1)]}</Box>;
}
