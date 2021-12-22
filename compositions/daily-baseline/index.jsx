import * as React from 'react';
import { Box, Image, Label, Video } from '#vcs-react/components';
import {
  useParams,
  useMode,
  useVideoTime,
  useActiveVideo,
} from '#vcs-react/hooks';

// -- the control interface exposed by this composition --
export const compositionInterface = {
  displayMeta: {
    name: 'Daily Baseline',
    description: "Composition with Daily's baseline features",
  },
  modes: ['single', 'split', 'grid', 'dominant'],
  params: [
    // -- video grid params --
    {
      id: 'showParticipantLabels',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'roundedCorners',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'dominantOnLeft',
      type: 'boolean',
      defaultValue: false,
    },
    // -- text overlay params --
    {
      id: 'showTextOverlay',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'textContent',
      type: 'text',
      defaultValue: 'An example text overlay',
    },
    {
      id: 'textPos_x',
      type: 'text',
      defaultValue: 100,
    },
    {
      id: 'textPos_y',
      type: 'text',
      defaultValue: 100,
    },
    {
      id: 'textRotationInDegrees',
      type: 'text',
      defaultValue: '0',
    },
    {
      id: 'textColor',
      type: 'text',
      defaultValue: 'rgba(255, 250, 200, 0.95)',
    },
  ],
};

// -- constants --
const DEFAULT_CORNER_RADIUS_PX = 25;
const DEFAULT_LABEL_FONT_SIZE_PX = 18;

// -- the root component of this composition --
export default function DailyBaselineVCS() {
  const params = useParams();

  const mode = useMode();

  // style applied to video elements.
  // placeholder is used if no video is available.
  const videoStyle = {
    cornerRadius_px: params.roundedCorners ? DEFAULT_CORNER_RADIUS_PX : 0,
  };
  const placeholderStyle = {
    fillColor: '#008',
  };
  const videoLabelStyle = {
    textColor: 'white',
    fontFamily: 'Roboto',
    fontWeight: '600',
    fontSize_px: DEFAULT_LABEL_FONT_SIZE_PX,
    strokeColor: 'rgba(0, 0, 0, 0.9)',
    strokeWidth_px: 4,
  };

  // props passed to the video layout component
  const videoProps = {
    videoStyle,
    placeholderStyle,
    videoLabelStyle,
    showLabels: params.showParticipantLabels,
  };
  let video;
  switch (mode) {
    default:
    case 'single':
      video = <VideoSingle {...videoProps} />;
      break;
    case 'grid':
      video = <VideoGrid {...videoProps} />;
      break;
    case 'split':
      video = <VideoSplit {...videoProps} />;
      break;
    case 'dominant':
      video = (
        <VideoDominant {...videoProps} dominantOnLeft={params.dominantOnLeft} />
      );
      break;
  }

  let graphics;
  if (params.showTextOverlay) {
    const overlayProps = {
      content: params.textContent,
      x: parseInt(params.textPos_x, 10),
      y: parseInt(params.textPos_y, 10),
      rotation: parseFloat(params.textRotationInDegrees),
      color: params.textColor,
    };
    graphics = <TextOverlay {...overlayProps} />;
  }

  return (
    <Box id="main">
      <Box id="videoBox">{video}</Box>
      <Box id="graphicsBox">{graphics}</Box>
    </Box>
  );
}

// --- components ---

function VideoSingle({ videoStyle, placeholderStyle }) {
  const { activeIds } = useActiveVideo();
  const activeId = activeIds.length > 0 ? activeIds[0] : null;

  if (activeId === null) {
    // if nobody is active, show a placeholder
    return <Box style={placeholderStyle} />;
  }

  return <Video id="videosingle" src={activeId} style={videoStyle} />;
}

const DOMINANT_SPLIT_PROP = 0.8;

function VideoDominant({
  showLabels,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
  dominantOnLeft,
}) {
  const { activeIds, activeScreenshareIds, dominantId } = useActiveVideo();

  const splitPos = dominantOnLeft
    ? DOMINANT_SPLIT_PROP
    : 1 - DOMINANT_SPLIT_PROP;

  function makeDominantItem(itemIdx) {
    const key = 'videodominant_' + itemIdx;
    const videoId = dominantId;

    let content;
    if (videoId === null) {
      // show a placeholder
      content = <Box style={placeholderStyle} />;
    } else {
      // render video with optional label
      let participantLabel;
      if (showLabels) {
        participantLabel = (
          <Label
            key={key + '_label'}
            style={videoLabelStyle}
            layout={[layoutFuncs.offset, { x: 10, y: 10 }]}
          >
            {`Video input id ${videoId}`}
          </Label>
        );
      }

      // TODO: get the real video aspect ratio
      const contentAspectRatio = 16 / 9;

      content = [
        <Video
          key={key + '_video'}
          src={videoId}
          style={videoStyle}
          layout={[layoutFuncs.fit, { contentAspectRatio }]}
        />,
        participantLabel,
      ];
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.splitVertical, { index: itemIdx, pos: splitPos }]}
      >
        {content}
      </Box>
    );
  }

  function makeTileColumn(itemIdx) {
    const key = 'videodominant_tiles_' + itemIdx;

    let videoIds = activeIds.filter((id) => id !== dominantId);
    const maxItems = 5;
    if (videoIds.length > maxItems) {
      videoIds = videoIds.slice(0, maxItems);
    }

    const items = [];
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      items.push(
        <Video
          key={videoId}
          src={videoId}
          style={videoStyle}
          layout={[layoutFuncs.column, { index: i, total: maxItems }]}
        />
      );
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.splitVertical, { index: itemIdx, pos: splitPos }]}
      >
        {items}
      </Box>
    );
  }

  const topItems = dominantOnLeft
    ? [makeDominantItem(0), makeTileColumn(1)]
    : [makeTileColumn(0), makeDominantItem(1)];

  return <Box id="videosplit">{topItems}</Box>;
}

function VideoSplit({
  showLabels,
  videoStyle,
  videoLabelStyle,
  placeholderStyle,
}) {
  const { activeIds } = useActiveVideo();

  function makeItem(itemIdx) {
    const key = 'videosplit_item' + itemIdx;
    const videoId = activeIds.length > itemIdx ? activeIds[itemIdx] : null;

    let content;
    if (videoId === null) {
      // show a placeholder
      content = <Box style={placeholderStyle} />;
    } else {
      // render video with optional label
      let participantLabel;
      if (showLabels) {
        participantLabel = (
          <Label
            key={key + '_label'}
            style={videoLabelStyle}
            layout={[layoutFuncs.offset, { x: 10, y: 10 }]}
          >
            {`Video input id ${videoId}`}
          </Label>
        );
      }

      // TODO: get the real video aspect ratio
      const contentAspectRatio = 16 / 9;

      content = [
        <Video
          key={key + '_video'}
          src={videoId}
          style={videoStyle}
          layout={[layoutFuncs.fit, { contentAspectRatio }]}
        />,
        participantLabel,
      ];
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.splitVertical, { index: itemIdx }]}
      >
        {content}
      </Box>
    );
  }

  return <Box id="videosplit">{[makeItem(0), makeItem(1)]}</Box>;
}

function VideoGrid({ showLabels, videoStyle, videoLabelStyle }) {
  const { activeIds } = useActiveVideo();

  const items = activeIds.map((srcIdx, i) => {
    const key = 'videogrid_item' + i;
    let participantLabel;
    if (showLabels && activeIds.length > 1) {
      participantLabel = (
        <Label
          style={videoLabelStyle}
          layout={[
            layoutFuncs.offset,
            { y: -Math.round(DEFAULT_LABEL_FONT_SIZE_PX / 2) },
          ]}
        >
          {`Video input id ${srcIdx}`}
        </Label>
      );
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.grid, { index: i, total: activeIds.length }]}
      >
        <Video src={srcIdx} style={videoStyle} />
        {participantLabel}
      </Box>
    );
  });

  return <Box id="videogrid">{items}</Box>;
}

function TextOverlay({ content, x, y, rotation, color }) {
  const textStyle = {
    textColor: color || 'rgba(255, 250, 200, 0.95)',
    fontFamily: 'Roboto',
    fontWeight: '500',
    fontSize_vh: 0.07,
    strokeColor: 'rgba(0, 0, 0, 0.8)',
    strokeWidth_px: 12,
  };
  let textTrs;
  if (rotation) {
    textTrs = {
      rotate_deg: rotation,
    };
  }

  const layoutFn = layoutFuncs.offset;
  const layoutParams = { x, y };

  return (
    <Label
      style={textStyle}
      transform={textTrs}
      layout={[layoutFn, layoutParams]}
    >
      {content || ''}
    </Label>
  );
}

// --- layout functions and utils ---

const layoutFuncs = {
  pad: (parentFrame, params) => {
    let { x, y, w, h } = parentFrame;
    const pad = params.pad || 0;

    x += pad;
    y += pad;
    w -= 2 * pad;
    h -= 2 * pad;

    return { x, y, w, h };
  },

  offset: (parentFrame, params) => {
    let { x, y, w, h } = parentFrame;

    x += params.x || 0;
    y += params.y || 0;

    return { x, y, w, h };
  },

  fit: (parentFrame, params) => {
    let contentAsp = params.contentAspectRatio;
    if (!Number.isFinite(contentAsp)) {
      // we can't fit without knowing the aspect ratio
      return { ...parentFrame };
    }

    let { x, y, w, h } = parentFrame;
    const parentAsp = w / h;

    if (contentAsp >= parentAsp) {
      // content is wider than frame
      h = w / contentAsp;

      y += (parentFrame.h - h) / 2;
    } else {
      // content is narrower than frame
      w = h * contentAsp;

      x += (parentFrame.w - w) / 2;
    }

    return { x, y, w, h };
  },

  splitVertical: (parentFrame, params) => {
    let { index, pos = 0.5 } = params;
    let { x, y, w, h } = parentFrame;

    if (index === 0) {
      w *= pos;
    } else {
      w *= 1 - pos;
      x += parentFrame.w * pos;
    }

    return { x, y, w, h };
  },

  column: (parentFrame, params, layoutCtx) => {
    const { index, total } = params;
    const { viewport } = layoutCtx;

    const outerMargin = total > 1 ? viewport.h * 0.05 : 0;
    const innerMargin = total > 1 ? viewport.h * 0.05 : 0;

    const numCols = 1;
    const numRows = total;

    // FIXME: hardcoded video item aspect ratio
    const videoAsp = 16 / 9;

    return computeGridItem({
      parentFrame,
      index,
      numCols,
      numRows,
      videoAsp,
      outerMargin,
      innerMargin,
    });
  },

  grid: (parentFrame, params, layoutCtx) => {
    const { index, total } = params;
    const { viewport } = layoutCtx;

    if (total < 1 || !isFinite(total)) {
      return { ...parentFrame };
    }

    const outerMargin = total > 1 ? viewport.h * 0.05 : 0;
    const innerMargin = total > 1 ? viewport.h * 0.05 : 0;

    const numCols = total > 9 ? 4 : total > 4 ? 3 : total > 1 ? 2 : 1;
    const numRows = Math.ceil(total / numCols);

    // FIXME: hardcoded video item aspect ratio
    const videoAsp = 16 / 9;

    return computeGridItem({
      parentFrame,
      index,
      numCols,
      numRows,
      videoAsp,
      outerMargin,
      innerMargin,
    });
  },
};

function computeGridItem({
  parentFrame,
  index,
  numCols,
  numRows,
  videoAsp,
  outerMargin,
  innerMargin,
}) {
  const parentAsp = parentFrame.w / parentFrame.h;
  const contentAsp = (numCols * videoAsp) / numRows;

  let { x, y, w, h } = parentFrame;
  let itemW, itemH;

  // item size depends on whether our content is wider or narrower than the parent frame
  if (contentAsp >= parentAsp) {
    itemW =
      (parentFrame.w - 2 * outerMargin - (numCols - 1) * innerMargin) / numCols;
    itemH = itemW / videoAsp;

    // center grid vertically
    x += outerMargin;
    y += (parentFrame.h - (numRows * itemH + innerMargin * (numRows - 1))) / 2;
  } else {
    itemH =
      (parentFrame.h - 2 * outerMargin - (numRows - 1) * innerMargin) / numRows;
    itemW = itemH * videoAsp;

    // center grid horizontally
    y += outerMargin;
    x += (parentFrame.w - (numCols * itemW + innerMargin * (numCols - 1))) / 2;
  }

  const col = index % numCols;
  const row = Math.floor(index / numCols);

  x += col * itemW;
  x += col * innerMargin;

  y += row * itemH;
  y += row * innerMargin;

  w = itemW;
  h = itemH;

  //console.log("computing grid %d / %d, rows/cols %d, %d: ", index, total, numRows, numCols, x, y);

  return { x, y, w, h };
}
