import * as React from "react";
import { Box, Video, Text, Image } from "#vcs-react/components";
import { useGrid, useParams } from "#vcs-react/hooks";
import * as layoutFuncs from "../layouts.js";
import { PausedPlaceholder } from "./PausedPlaceholder.js";
import decorateVideoGridItem from "./overrides/decorateVideoGridItem.js";
import { DEFAULT_OFFSET_VIDEO_SINGLE_PX } from "../constants.js";

let primaryColor;
let pauseBgColor;

export default function AugmentedGrid(props) {
  const { participantDescs = [] } = props;
  const params = useParams();

  const currentLayout = params["currentLayout"];
  primaryColor = params["voedaily.primary.color"];
  pauseBgColor = params["voedaily.pause.bgColor"];
  let baseVideo, otherOverlays;
  let bubbleIdx;

  switch (currentLayout) {
    case "2x2":
      bubbleIdx = 4;
      baseVideo = <VideoGrid {...props} />;
      break;
    default:
      bubbleIdx = null;
      baseVideo = <VideoGrid {...props} />;
      break;
  }
  if (bubbleIdx) {
    if (participantDescs.length > bubbleIdx) {
      otherOverlays = (
        <PipRow participantDescs={participantDescs.slice(bubbleIdx)} />
      );
    }
  }

  return (
    <Box>
      {baseVideo && baseVideo}
      {otherOverlays && otherOverlays}
    </Box>
  );
}
/* will be used once display name alignment is done */
function getInitials(name) {
  let initials;
  if (name.indexOf("|") >= 0) {
    initials = name.split("|")[0].substring(0, 2).toUpperCase(); // Has initials
  } else {
    initials =
      name.indexOf("_") > 0
        ? name
            .split("_")
            .map((x) => x && x[0])
            .join()
            .replace(",", "")
            .toUpperCase() // Get first name and last name to initials
        : "AN"; // Anonymous
  }
  return initials;
}
// a row of picture-in-picture videos, using an inline layout function
//
function PipRow({ participantDescs }) {
  const pxPerGu = useGrid().pixelsPerGridUnit;
  const pipSize_gu = 6;
  const margin_gu = 2;
  const interval_gu = 1;

  const videoStyle = {
    cornerRadius_px: (pipSize_gu / 2) * pxPerGu, // mask to circle
  };
  const outlineStyle = {
    ...videoStyle,
    strokeWidth_px: 2, // the outline for the video
    strokeColor: primaryColor,
  };
  const fillStyle = {
    cornerRadius_px: (pipSize_gu / 2) * pxPerGu, // mask to circle
    strokeWidth_px: 2, // the outline for the video
    strokeColor: primaryColor,
    fillColor: pauseBgColor,
  };

  function rowLayoutFn(parentFrame, params) {
    const { idx } = params;
    let { x, y, w, h } = parentFrame;
    const margin = margin_gu * pxPerGu;
    const interval = interval_gu * pxPerGu;

    w = h = pipSize_gu * pxPerGu;

    x += margin + (interval + w) * idx;
    y += parentFrame.h - margin - h;

    return { x, y, w, h };
  }

  const labelStyle = {
    textColor: primaryColor,
    fontFamily: "DMSans",
    fontWeight: "700",
    textAlign: "center",
    fontSize_px: 40,
  };

  return participantDescs.map((pd, idx) => {
    const { videoId, paused, displayName = "" } = pd;

    return paused ? (
      <Box id="pipOutline" style={fillStyle} layout={[rowLayoutFn, { idx }]}>
        {displayName ? (
          <Box clip layout={[layoutFuncs.centerYIfNeeded, { minH_gu: 2 }]}>
            <Text
              clip
              style={labelStyle}
              layout={[
                layoutFuncs.placeText,
                { vAlign: "center", hAlign: "center", idx },
              ]}
            >
              {getInitials(displayName)}
            </Text>
          </Box>
        ) : (
          <Image src="user_white_64.png" scaleMode="fill" />
        )}
      </Box>
    ) : (
      <Box key={idx} style={outlineStyle} layout={[rowLayoutFn, { idx }]}>
        <Video src={videoId} scaleMode="fill" style={videoStyle} />
      </Box>
    );
  });
}

function VideoGrid(gridProps) {
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

  const totalNumItems = 4; // participantDescs.length;
  const take4Parts = participantDescs.slice(0, 4);
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
    let key = "videogriditem_" + index;

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
          key={"label_" + displayName}
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
      if (hasLiveVideo && videoScaleMode === "fit") {
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
          key={key + "_highlight"}
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
    <Box id="videogrid">{take4Parts.map((d, idx) => makeItem(idx, d))}</Box>
  );
}
