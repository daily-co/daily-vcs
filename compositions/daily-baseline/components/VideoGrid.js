import * as React from "react";
import { Box, Video, Text, Image } from "#vcs-react/components";
import { useGrid, useParams } from "#vcs-react/hooks";
import * as layoutFuncs from "../layouts.js";
import { PausedPlaceholder } from "./PausedPlaceholder.js";
import decorateVideoGridItem from "./overrides/decorateVideoGridItem.js";
import {
  DEFAULT_OFFSET_VIDEO_SINGLE_PX,
  PositionCorner,
} from "../constants.js";

let primaryColor;
let pauseBgColor;

export default function AugmentedGrid(props) {
  const { participantDescs = [] } = props;
  const params = useParams();

  const currentLayout = params["currentLayout"];
  primaryColor = params["voedaily.primary.color"];
  pauseBgColor = params["voedaily.pause.bgColor"];

  let baseVideo, pipOverlay, otherOverlays;
  let pipIdx;
  let bubbleIdx;

  switch (currentLayout) {
    case "2x2":
      pipIdx = null;
      bubbleIdx = 4;
      baseVideo = (
        <VideoGrid
          participantDescs={participantDescs.slice(0, 4)}
          itemInterval_gu={0}
          outerPadding_gu={0}
        />
      );
      break;
    case "2x2withPIP":
      pipIdx = 4;
      bubbleIdx = 5;
      baseVideo = (
        <VideoGrid
          participantDescs={participantDescs.slice(0, 4)}
          itemInterval_gu={0}
          outerPadding_gu={0}
        />
      );
      break;
    default:
      pipIdx = null;
      bubbleIdx = null;
      baseVideo = <VideoGrid {...props} />;
      break;
  }
  if (pipIdx) {
    if (participantDescs.length > pipIdx) {
      pipOverlay = <SimplePip participant={participantDescs[pipIdx]} />;
    }
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
      {pipOverlay && pipOverlay}
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

// a simple picture-in-picture with hardcoded settings
// using the same layout function as VideoPip.js
//
function SimplePip({ participant }) {
  const { videoId, displayName = "", paused } = participant;
  const pxPerGu = useGrid().pixelsPerGridUnit;
  const pipSize_gu = 6;

  const layoutProps = {
    positionCorner: PositionCorner.TOP_RIGHT,
    aspectRatio: 1,
    height_gu: pipSize_gu,
    margin_gu: 2,
  };
  const layout = [layoutFuncs.pip, layoutProps];

  const labelStyle = {
    textColor: primaryColor,
    fontFamily: "DMSans",
    fontWeight: "700",
    textAlign: "center",
    fontSize_gu: 2,
  };

  const videoStyle = {
    cornerRadius_px: (pipSize_gu / 2) * pxPerGu, // mask to circle
  };
  const outlineStyle = {
    ...videoStyle,
    strokeWidth_px: pxPerGu / 3, // the outline for the video
    strokeColor: primaryColor,
  };
  const fillStyle = {
    ...videoStyle,
    fillColor: pauseBgColor,
    strokeWidth_px: pxPerGu / 3, // the outline for the video
    strokeColor: primaryColor,
  };

  let content;
  if (paused || videoId == null) {
    // no video available, show a placeholder with the icon
    content = (
      <Box style={fillStyle} layout={layout}>
        {displayName ? (
          <Text
            clip
            style={labelStyle}
            layout={[
              layoutFuncs.placeText,
              { vAlign: "center", hAlign: "center", yOffset_gu: 0.45 },
            ]}
          >
            {getInitials(displayName)}
          </Text>
        ) : (
          <Image src="user_white_64.png" scaleMode="fill" />
        )}
      </Box>
    );
  } else {
    content = (
      <Box style={outlineStyle} layout={layout}>
        <Video
          id="pipVideo"
          src={videoId}
          scaleMode="fill"
          style={videoStyle}
        />
      </Box>
    );
  }

  const arr = [content];

  return (
    <Box
      clip
      style={{
        cornerRadius_px: videoStyle.cornerRadius_px,
      }}
    >
      {arr}
    </Box>
  );
}

// a row of picture-in-picture videos, using an inline layout function
//
function PipRow({ participantDescs }) {
  const pxPerGu = useGrid().pixelsPerGridUnit;
  const pipSize_gu = 4;
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
    fontSize_gu: 2,
  };

  return participantDescs.map((pd, idx) => {
    const { videoId, paused, displayName = "" } = pd;

    return paused ? (
      <Box
        id={idx + "_pipAudience"}
        style={fillStyle}
        layout={[rowLayoutFn, { idx }]}
      >
        {displayName ? (
          <Text
            clip
            style={labelStyle}
            layout={[
              layoutFuncs.placeText,
              { vAlign: "center", hAlign: "center", yOffset_gu: 0.45 },
            ]}
          >
            {getInitials(displayName)}
          </Text>
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
    labelsOffset_px = 0,
    participantDescs,
    itemInterval_gu = -1,
    outerPadding_gu = -1,
    preserveItemAspectRatio = true,
    fullScreenHighlightItemIndex = -1,
  } = gridProps;

  const totalNumItems = participantDescs.length;
  itemInterval_gu = Math.max(-1, itemInterval_gu);
  outerPadding_gu = Math.max(-1, outerPadding_gu);

  function makeItem(index, itemProps) {
    const { isAudioOnly, videoId, displayName, paused } = itemProps;
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
      customComponent: customDecoratorComponent,
      clipItem = false,
      customLayoutForVideo,
    } = decorateVideoGridItem(index, itemProps, gridProps);

    const fillStyle = {
      fillColor: pauseBgColor,
    };

    let participantLabel;
    if (enableDefaultLabels && displayName.length > 0) {
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
          layout={[labelLayout, { textH: 40, offsets }]}
          clip
        >
          {displayName}
        </Text>
      );
    }

    const videoScaleMode = "fit";
    const hasLiveVideo = !isAudioOnly && !paused;

    let video;
    if (!hasLiveVideo) {
      video = (
        <PausedPlaceholder
          layout={customLayoutForVideo}
          placeholderStyle={fillStyle}
        />
      );
    } else {
      video = (
        <Video
          src={videoId}
          scaleMode={videoScaleMode}
          layout={customLayoutForVideo}
          blend={videoBlend}
        />
      );
    }

    return (
      <Box key={key} id={key} layout={itemLayout} clip={clipItem}>
        {video}
        {participantLabel}
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
