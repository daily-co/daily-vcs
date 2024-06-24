import * as React from 'react';
import { Box, Video, WebFrame } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { PositionEdge } from '../constants.js';
import { ParticipantLabelPipStyle } from './ParticipantLabelPipStyle.js';
import { PausedPlaceholder } from './PausedPlaceholder.js';
import VideoSingle from './VideoSingle.js';
import decorateVideoDominantItem from './overrides/decorateVideoDominantItem.js';

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
    allowAudioDominant = true,
    itemInterval_gu = 0.7,
    outerPadding_gu = 0.5,
    splitMargin_gu = 0,
    disableRoundedCornersOnMain = false,
    includeWebFrame = false,
    webFrameProps = {},
  } = props;

  itemInterval_gu = Math.max(0, itemInterval_gu);
  outerPadding_gu = Math.max(0, outerPadding_gu);

  let audioDominantParticipant;

  if (includeWebFrame) {
    // if WebFrame is included, it's always going to take the dominant layout position
    dominantVideoId = null;
  } else {
    if (allowAudioDominant) {
      audioDominantParticipant = participantDescs.find(
        (d) => d.isAudioOnly && d.dominant
      );
    }

    if (
      (!followDominantFlag ||
        (!dominantVideoId && !audioDominantParticipant)) &&
      participantDescs.length > 0
    ) {
      dominantVideoId = participantDescs[0].videoId;
    }
  }

  const single =
    (!includeWebFrame && participantDescs.length === 1) ||
    (includeWebFrame && participantDescs.length === 0);
  const dominantFirst =
    positionEdge === PositionEdge.LEFT || positionEdge === PositionEdge.TOP;
  const isVerticalSplit =
    positionEdge === PositionEdge.LEFT || positionEdge === PositionEdge.RIGHT;

  if (!dominantFirst) {
    splitPos = 1 - splitPos;
  }

  let mainLayoutFn, chicletsIsRow;
  if (!single) {
    if (isVerticalSplit) {
      mainLayoutFn = layoutFuncs.splitVertical;
      chicletsIsRow = false;
    } else {
      mainLayoutFn = layoutFuncs.splitHorizontal;
      chicletsIsRow = true;
    }
  }

  function makeDominantItem(itemIdx) {
    const domLayout = [
      mainLayoutFn,
      { index: itemIdx, pos: splitPos, margin_gu: splitMargin_gu },
    ];

    if (includeWebFrame) {
      return (
        <WebFrame
          key="videodominant_webframe"
          src={webFrameProps.src}
          viewportSize={{
            w: webFrameProps.viewportWidth_px,
            h: webFrameProps.viewportHeight_px,
          }}
          layout={domLayout}
          keyPressAction={{
            name: webFrameProps.keyPressActionName,
            key: webFrameProps.keyPressActionKey,
            modifiers: webFrameProps.keyPressModifiers,
          }}
        />
      );
    } else {
      const key = 'videodominant_item' + itemIdx;

      const participant =
        audioDominantParticipant ||
        participantDescs.find(
          (d) => d.videoId != null && d.videoId == dominantVideoId
        );

      // override point #1 for custom decorations on the dominant item.
      // we use a VideoSingle component to actually render these,
      // so get the decoration here and pass it as an override to VideoSingle.
      const overrideDecoration = decorateVideoDominantItem(
        true,
        0,
        participant,
        props
      );
      return (
        <Box key={key} id={key} layout={domLayout}>
          <VideoSingle
            enableParticipantOverride={true}
            overrideParticipant={participant}
            disableRoundedCorners={disableRoundedCornersOnMain}
            overrideDecoration={overrideDecoration}
            {...props}
          />
        </Box>
      );
    }
  }

  function makeChiclets(itemIdx) {
    const key = 'videodominant_tiles_' + itemIdx;

    let pArr = participantDescs.filter(
      (d) =>
        d !== audioDominantParticipant &&
        (d.videoId == null || d.videoId !== dominantVideoId)
    );
    if (pArr.length > maxItems) {
      pArr = pArr.slice(0, maxItems);
    }

    const items = [];
    for (let i = 0; i < pArr.length; i++) {
      const participant = pArr[i];
      const { videoId, paused, displayName } = participant;
      const key = `videochiclet_${i}_${participant.key}`;

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

      // override point #2 for custom decorations on chiclet items
      const {
        enableDefaultLabels = true,
        customComponent: customDecoratorComponent,
        clipItem = false,
        customLayoutForVideo,
      } = decorateVideoDominantItem(false, i, participant, props);

      const childItems = [];

      childItems.push(
        paused || videoId == null ? (
          <PausedPlaceholder
            key={key + '_video_paused'}
            layout={customLayoutForVideo}
            {...{ placeholderStyle }}
          />
        ) : (
          <Video
            key={key + '_video'}
            src={videoId}
            style={videoStyle}
            scaleMode={scaleMode}
            layout={customLayoutForVideo}
          />
        )
      );
      if (enableDefaultLabels && showLabels) {
        childItems.push(
          <ParticipantLabelPipStyle
            key={key + '_label'}
            label={displayName}
            labelStyle={videoLabelStyle}
            labelsOffset_px={labelsOffset_px}
          />
        );
      }
      if (customDecoratorComponent) childItems.push(customDecoratorComponent);

      const containerStyle = clipItem
        ? {
            cornerRadius_px: videoStyle.cornerRadius_px,
          }
        : null;

      items.push(
        <Box key={key} clip={clipItem} layout={layout} style={containerStyle}>
          {childItems}
        </Box>
      );
    } // end of participants loop

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
