import * as React from "react";
import { Box, Video, Text, Image } from "#vcs-react/components";
import {
  useGrid,
  useParams,
  useActiveVideo,
  useVideoTime,
} from "#vcs-react/hooks";
import * as layoutFuncs from "../layouts.js";
import VideoSingle from "./VideoSingle.js";
import { PausedPlaceholder } from "./PausedPlaceholder.js";
import decorateVideoSplitItem from "./overrides/decorateVideoSplitItem.js";
import { PositionCorner } from "../constants.js";

const ANIM_SPEED = 0.5;

let primaryColor;
let pauseBgColor;
let isSharingScreen;
let screenShareIdx;
let prodId;
let isHideAudienceStream;
let isHideMutedVideos;
let isHidePoorNetworkAudience;

export default function AugmentedSplit(props) {
  const { participantDescs = [] } = props;
  const params = useParams();

  const currentLayout = params["currentLayout"];
  primaryColor = params["voedaily.primary.color"];
  pauseBgColor = params["voedaily.pause.bgColor"];
  isSharingScreen = params["voedaily.isSharingScreen"];
  screenShareIdx = params["voedaily.screenShareIdx"];
  isHideAudienceStream = params["isHideAudienceStream"];
  isHideMutedVideos = params["isHideMutedVideos"];
  isHidePoorNetworkAudience = params["isHidePoorNetworkAudience"];
  prodId = params["producerId"];

  let baseVideo, pipOverlay, otherOverlays;
  let pipIdx;
  let bubbleIdx;
  let parts;

  switch (currentLayout) {
    case "1x1":
      pipIdx = null;
      bubbleIdx = isSharingScreen ? 2 : 1;
      baseVideo = (
        <VideoSingleCustom participantDescs={[participantDescs[0]]} />
      );
      break;
    case "2x1":
      pipIdx = null;
      bubbleIdx = isSharingScreen ? 3 : 2;
      if (isSharingScreen)
        parts =
          screenShareIdx === 0
            ? [participantDescs[2], participantDescs?.[0]]
            : [participantDescs[0], participantDescs[2]];
      else parts = participantDescs;
      baseVideo = (
        <VideoSplit
          {...props}
          participantDescs={parts}
          screenShareIdx={screenShareIdx}
        />
      );
      break;
    case "1x1withPIP":
      pipIdx = isSharingScreen ? 2 : 1;
      bubbleIdx = isSharingScreen ? 3 : 2;
      baseVideo = (
        <VideoSingleCustom participantDescs={[participantDescs[0]]} />
      );
      break;
    case "2x1withPIP":
      pipIdx = isSharingScreen ? 3 : 2;
      bubbleIdx = isSharingScreen ? 4 : 3;
      if (isSharingScreen)
        parts =
          screenShareIdx === 0
            ? [participantDescs[2], participantDescs?.[0]]
            : [participantDescs[0], participantDescs[2]];
      else parts = participantDescs;
      baseVideo = (
        <VideoSplit
          {...props}
          participantDescs={parts}
          screenShareIdx={screenShareIdx}
        />
      );
      break;
    default:
      pipIdx = null;
      bubbleIdx = null;
      baseVideo = <VideoSplit {...props} />;
      break;
  }
  if (pipIdx) {
    if (participantDescs.length > pipIdx && participantDescs?.[pipIdx]) {
      if (prodId) parts = participantDescs.filter((id) => id !== prodId);
      else parts = participantDescs;
      pipOverlay = <SimplePip participant={parts[pipIdx]} prodId={prodId} />;
    }
  }
  if (bubbleIdx) {
    if (participantDescs.length > bubbleIdx) {
      const allAudiences = participantDescs.slice(bubbleIdx);
      let remainingAudiences;
      // if (allAudiences?.length > 12) {
      //   remainingAudiences = allAudiences.slice(12, allAudiences.length - 1);
      //   allAudiences.length = 12;
      // }
      const pxPerGu = useGrid().pixelsPerGridUnit;

      function fixedWidthLayout(parentFrame, params) {
        const pipSize_gu = 4;
        const margin_gu = 2;
        const interval_gu = 1;
        const visibleCount = 12;
        const w =
          visibleCount * (pipSize_gu * pxPerGu + interval_gu * pxPerGu) +
          2 * margin_gu * pxPerGu;
        const h = parentFrame.h;
        const x = parentFrame.x;
        const y = parentFrame.y;
        return { x, y, w, h };
      }
      if (allAudiences.length > 0 && !isHideAudienceStream) {
        otherOverlays = (
          <Box
            key="audience_lazy"
            id="audience_lazy"
            layout={[fixedWidthLayout, {}]}
          >
            <PipRow
              participantDescs={participantDescs.slice(bubbleIdx)}
              prodId={prodId}
              isHideMutedVideos={isHideMutedVideos}
              isHidePoorNetworkAudience={isHidePoorNetworkAudience}
              isHideAudienceStream={isHideAudienceStream}
            />
          </Box>
        );
      }
    }
  }

  return (
    <Box>
      {baseVideo && baseVideo}
      {pipOverlay && pipOverlay}
      {!isHideAudienceStream && otherOverlays && otherOverlays}
    </Box>
  );
}

/* will be used once display name alignment is done */
function getInitials(name) {
  let initials;

  if (name.indexOf("|") >= 0) {
    const getFN = `${name.split("|")[0].substring(0, 1)}${name
      .split("|")[1]
      .substring(0, 1)}`;
    initials = getFN.toUpperCase(); // Has initials
  } else {
    initials =
      name.indexOf("_") > 0
        ? name
            .split("_")
            .map((x) => x && x[0])
            .join()
            .replace(",", "")
            .toUpperCase() // Get first name and last name to initials
        : "ZZ"; // Anonymous
  }
  return initials;
}

// a simple picture-in-picture with hardcoded settings
// using the same layout function as VideoPip.js
//
function SimplePip({ participant, prodId }) {
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
    fontSize_gu: 3,
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
              { vAlign: "center", hAlign: "center", yOffset_gu: 0.77 },
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

  return prodId !== videoId ? (
    <Box
      clip
      style={{
        cornerRadius_px: videoStyle.cornerRadius_px,
      }}
      key={"simple_pip"}
    >
      {arr}
    </Box>
  ) : (
    <></>
  );
}

function updateAnim(prev, t) {
  const dT = t - prev.t;
  // const speed = ANIM_SPEED;
  // const pos = {
  //   x: prev.pos.x + prev.dir.x * speed * dT,
  //   y: prev.pos.y + prev.dir.y * speed * dT,
  // };
  // const dir = { ...prev.dir };
  // if (pos.x >= 1 || pos.x <= 0) {
  //   pos.x = Math.min(1, Math.max(0, pos.x));
  //   dir.x *= -1;
  // }
  // if (pos.y >= 1 || pos.y <= 0) {
  //   pos.y = Math.min(1, Math.max(0, pos.y));
  //   dir.y *= -1;
  // }
  // Move horizontally, loop back to 0 when reaching 1
  // Always move left, wrap to right when reaching the start
  // const dT = t - prev.t;
  const speed = ANIM_SPEED;
  // Always move left, wrap to right when reaching the start
  let x = prev.pos.x - speed * dT;
  if (x < 0) x = 1;
  const pos = {
    x,
    y: prev.pos.y, // keep y constant
  };
  return {
    t,
    pos,
    dir: { x: -1, y: 0 }, // always move left
  };
}

// a row of picture-in-picture videos, using an inline layout function
//
function PipRow({
  participantDescs,
  prodId,
  isHideMutedVideos,
  isHidePoorNetworkAudience,
  isHideAudienceStream,
}) {
  const pxPerGu = useGrid().pixelsPerGridUnit;
  const pipSize_gu = 4;
  const margin_gu = 2;
  const interval_gu = 1;
  const visibleCount = 13;
  const t = useVideoTime();

  const itemWidthPx = pipSize_gu * pxPerGu + interval_gu * pxPerGu;
  const total = participantDescs.length;

  // Animation state - use ref to persist across renders
  const animRef = React.useRef({
    t: -1,
    frame: -1,
    offset: 0,
  });

  // Update animation state only when frame changes
  const FPS = 1 / 30; // 30 fps animation update rate
  const frame = Math.floor(t / FPS);

  if (frame !== animRef.current.frame) {
    const dT = t - animRef.current.t;
    const speed = ANIM_SPEED * 0.05; // Slow pace
    const rowWidthPx = total * itemWidthPx;

    // Update offset position
    let newOffset = animRef.current.offset - speed * dT * itemWidthPx * total;
    if (newOffset < -rowWidthPx) {
      newOffset += rowWidthPx;
    }

    animRef.current = {
      t,
      frame,
      offset: newOffset,
    };
  }

  function rowLayoutFn(parentFrame, params) {
    const { xPx } = params;
    let { x, y, w, h } = parentFrame;
    const margin = margin_gu * pxPerGu;

    w = h = pipSize_gu * pxPerGu;

    // Position item horizontally, wrap for infinite loop
    x += margin + xPx;
    y += parentFrame.h - margin - h;

    return { x, y, w, h };
  }
  const videoStyle = {
    cornerRadius_px: (pipSize_gu / 2) * pxPerGu, // mask to circle
  };
  const labelStyle = {
    textColor: primaryColor,
    fontFamily: "DMSans",
    fontWeight: "700",
    textAlign: "center",
    fontSize_gu: 2,
  };

  // Calculate the total width of the scrolling row
  const rowWidthPx = total * itemWidthPx;

  return participantDescs.map((pd, idx) => {
    const { videoId, paused, displayName = "" } = pd;

    // Calculate x position using the memoized animation state
    let xPx = (idx * itemWidthPx + animRef.current.offset) % rowWidthPx;
    if (xPx < 0) xPx += rowWidthPx;

    // Only render items that are within the visible area
    if (xPx > visibleCount * itemWidthPx) return null;

    return videoId !== prodId ? (
      paused ? (
        isHideMutedVideos ? (
          <Box
            id={idx + "hide_audience"}
            style={{
              cornerRadius_px: (pipSize_gu / 2) * pxPerGu,
              strokeWidth_px: 2,
              strokeColor: primaryColor,
              fillColor: pauseBgColor,
            }}
            layout={[rowLayoutFn, { xPx }]}
          >
            <Text
              clip
              style={labelStyle}
              layout={[
                layoutFuncs.placeText,
                { vAlign: "center", hAlign: "center", yOffset_gu: 0.67 },
              ]}
            >
              no
            </Text>
          </Box>
        ) : (
          <Box
            id={idx + "_pipAudience"}
            style={{
              cornerRadius_px: (pipSize_gu / 2) * pxPerGu,
              strokeWidth_px: 2,
              strokeColor: primaryColor,
              fillColor: pauseBgColor,
            }}
            layout={[rowLayoutFn, { xPx }]}
          >
            {displayName ? (
              <Text
                clip
                style={labelStyle}
                layout={[
                  layoutFuncs.placeText,
                  { vAlign: "center", hAlign: "center", yOffset_gu: 0.67 },
                ]}
              >
                {getInitials(displayName)}
              </Text>
            ) : (
              <Image src="user_white_64.png" scaleMode="fill" />
            )}
          </Box>
        )
      ) : (
        <Box
          key={idx}
          style={{
            cornerRadius_px: (pipSize_gu / 2) * pxPerGu,
            strokeWidth_px: 2,
            strokeColor: primaryColor,
          }}
          layout={[rowLayoutFn, { xPx }]}
        >
          <Video src={videoId} scaleMode="fill" style={videoStyle} />
        </Box>
      )
    ) : null;
  });
}

// this is the original VideoSplit function from the baseline composition
//
function VideoSplit(props) {
  const {
    participantDescs = [],
    margin_gu = 0,
    splitDirection,
    screenShareIdx,
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
        {screenShareIdx === itemIdx ? (
          <VideoSingleCustom participantDescs={[participant]} />
        ) : (
          <VideoSingle
            enableParticipantOverride={true}
            overrideParticipant={participant}
            overrideDecoration={overrideDecoration}
            {...props}
            placeholderStyle={fillStyle}
          />
        )}
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
  const { activeScreenshareIds } = useActiveVideo({ preferScreenshare: true });
  const activeSSId =
    activeScreenshareIds.length > 0 ? activeScreenshareIds[0] : null;

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
        src={activeSSId || videoId}
        scaleMode={isScreenshare ? "fit" : "fill"}
      />
    </Box>
  );
}
