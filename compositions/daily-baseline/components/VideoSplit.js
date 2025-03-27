import * as React from 'react';
import { Box } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import VideoSingle from './VideoSingle.js';
import decorateVideoSplitItem from './overrides/decorateVideoSplitItem.js';

export default function VideoSplit(props) {
  const {
    participantDescs = [],
    margin_gu = 0,
    splitDirection,
    zoomFactors,
    scaleModeOverrides,
  } = props;
  // Make sure we have exactly one or two boxes
  const totalItems = Math.max(1, Math.min(participantDescs.length, 2));

  let layoutFn;
  switch (splitDirection) {
    default:
      layoutFn = layoutFuncs.splitAcrossLongerDimension;
      break;
    case 'horizontal':
      layoutFn = layoutFuncs.splitHorizontal;
      break;
    case 'vertical':
      layoutFn = layoutFuncs.splitVertical;
      break;
  }

  function makeItem(itemIdx) {
    const key = 'videosplit_item' + itemIdx;
    const participant = participantDescs[itemIdx];

    // override point for custom decorations on split videos.
    // we use a VideoSingle component to actually render these,
    // so get the decoration here and pass it as an override to VideoSingle.
    const overrideDecoration = decorateVideoSplitItem(
      itemIdx,
      participant,
      props
    );

    const zoom =
      zoomFactors[itemIdx] != null ? parseFloat(zoomFactors[itemIdx]) : 1;

    let videoProps = props;

    if (scaleModeOverrides[itemIdx] != null) {
      const scaleMode = scaleModeOverrides[itemIdx];
      videoProps = { ...props, scaleMode, scaleModeForScreenshare: scaleMode };
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFn, { index: itemIdx, margin_gu, pos: 1 / totalItems }]}
      >
        <VideoSingle
          enableParticipantOverride={true}
          overrideParticipant={participant}
          overrideDecoration={overrideDecoration}
          zoomFactor={zoom}
          {...videoProps}
        />
      </Box>
    );
  }

  if (totalItems === 1) {
    return <Box id="videosplit">{[makeItem(0)]}</Box>;
  } else {
    return <Box id="videosplit">{[makeItem(0), makeItem(1)]}</Box>;
  }
}
