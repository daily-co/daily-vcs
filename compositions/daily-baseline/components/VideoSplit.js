import * as React from "react";
import { Box, Video, Text, Image } from "#vcs-react/components";
import { useGrid, useParams } from "#vcs-react/hooks";
import * as layoutFuncs from "../layouts.js";
import VideoSingle from "./VideoSingle.js";
import { PausedPlaceholder } from "./PausedPlaceholder.js";
import decorateVideoSplitItem from "./overrides/decorateVideoSplitItem.js";
import { PositionCorner } from "../constants.js";

import { debug } from "#vcs-stdlib/components";
import { RoomContext } from "#vcs-react/contexts";

const textSize_gu = 1;
const headerH_gu = textSize_gu * 10;

let primaryColor;
let pauseBgColor;

function body(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const pxPerGu = layoutCtx.pixelsPerGridUnit;

  const headerH_px = headerH_gu * pxPerGu;
  y += headerH_px;
  h -= headerH_px;

  return { x, y, w, h };
}

export default function AugmentedSplit(props) {
  const { participantDescs = [] } = props;
  const params = useParams();

  const currentLayout = params["currentLayout"];
  primaryColor = params["voedaily.primary.color"];
  pauseBgColor = params["voedaily.pause.bgColor"];

  let baseVideo, pipOverlay, otherOverlays;
  let pipIdx;
  let bubbleIdx;
  const room = React.useContext(RoomContext);

  switch (currentLayout) {
    case "1x1":
      pipIdx = null;
      bubbleIdx = 1;
      baseVideo = <VideoSingleCustom {...props} />;
      break;
    case "2x1":
      pipIdx = null;
      bubbleIdx = 2;
      baseVideo = <VideoSplit {...props} />;
      break;
    case "1x1withPIP":
      pipIdx = 1;
      bubbleIdx = 2;
      baseVideo = <VideoSingleCustom {...props} />;
      break;
    case "2x1withPIP":
      pipIdx = 2;
      bubbleIdx = 3;
      baseVideo = <VideoSplit {...props} />;
      break;
    default:
      pipIdx = null;
      bubbleIdx = null;
      baseVideo = <VideoSplit {...props} />;
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
      <debug.RoomPrintout
        layout={[body]}
        room={room}
        bgOpacity={0.5}
        headerTextColor="rgba(255, 255, 255, 0.68)"
        textSize_gu={1}
      />
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
  const pipSize_gu = 10;

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
    fontSize_px: 56,
  };

  // const layoutPause = [centerText, { minH_gu: 5, minW_gu: 3 }];
  const layoutPause = [
    layoutFuncs.placeText,
    { vAlign: "center", hAlign: "center" },
  ];

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
      <Box id="pipOutline" style={fillStyle} layout={layout}>
        {displayName ? (
          <Box clip layout={[layoutFuncs.centerYIfNeeded, { minH_gu: 2 }]}>
            <Text clip style={labelStyle} layout={layoutPause}>
              {getInitials(displayName)}
            </Text>
          </Box>
        ) : (
          <Image src="user_white_64.png" scaleMode="fill" />
        )}
      </Box>
    );
  } else {
    content = (
      <Box id="pipOutline" style={outlineStyle} layout={layout}>
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

// this is the original VideoSplit function from the baseline composition
//
function VideoSplit(props) {
  const {
    participantDescs = [],
    margin_gu = 0,
    splitDirection,
    currentLayout,
  } = props;
  // Make sure we have exactly one or two boxes
  const totalItems = Math.max(1, Math.min(participantDescs.length, 2));

  let layoutFn;
  switch (splitDirection) {
    default:
      layoutFn = layoutFuncs.splitAcrossLongerDimension;
      break;
    case "horizontal":
      layoutFn = layoutFuncs.splitHorizontal;
      break;
    case "vertical":
      layoutFn = layoutFuncs.splitVertical;
      break;
  }

  function makeItem(itemIdx) {
    const key = "videosplit_item" + itemIdx;
    const participant = participantDescs[itemIdx];

    // override point for custom decorations on split videos.
    // we use a VideoSingle component to actually render these,
    // so get the decoration here and pass it as an override to VideoSingle.
    const overrideDecoration = decorateVideoSplitItem(
      itemIdx,
      participant,
      props
    );
    const fillStyle = {
      fillColor: pauseBgColor,
    };

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
          placeholderStyle={fillStyle}
          {...props}
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

function VideoSingleCustom(props) {
  let { participantDescs = [] } = props;

  const participant = participantDescs[0];
  const { videoId, paused, isScreenshare } = participant || {};
  const fillStyle = {
    fillColor: pauseBgColor,
  };

  return paused ? (
    <PausedPlaceholder placeholderStyle={fillStyle} />
  ) : (
    <Box key="videosingle_0">
      <Video
        key="video"
        src={videoId}
        scaleMode={isScreenshare ? "fit" : "fill"}
      />
    </Box>
  );
}
