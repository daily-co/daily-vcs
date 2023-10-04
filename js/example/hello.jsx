import * as React from 'react';
import { Box, Image, Text, Video } from '#vcs-react/components';
import { useParams, useVideoTime, useActiveVideo } from '#vcs-react/hooks';

// -- the control interface exposed by this composition --
export const compositionInterface = {
  displayMeta: {
    name: 'Hello Daily',
    description: 'An example composition in a single file',
  },
  params: [
    {
      id: 'showGraphics',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'graphicsOnSide',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'fitGridToGraphics',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'showParticipantLabels',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'useRoundedCornersStyle',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'demoText',
      type: 'text',
      defaultValue: 'Hello world',
    },
  ],
};

// -- the root component of this composition --
export default function HelloDailyVCS() {
  // this comp's params are defined in 'compositionInterface' above.
  // this hook lets us get the current param values.
  const params = useParams();

  // params that control the presence and positioning of graphics
  const { showGraphics, fitGridToGraphics, graphicsOnSide: onSide } = params;

  // layout setup for graphics based on params
  const baseLayoutFn = onSide ? layoutFuncs.splitH : layoutFuncs.splitV;
  const splitPos = onSide ? 0.8 : 0.67;
  const graphicsLayout = [baseLayoutFn, { index: 1, pos: splitPos }];

  // if we want to shrink the grid so it doesn't overlap with the graphics,
  // pass it the same split layout function, just with a different index
  let gridLayout;
  if (showGraphics && fitGridToGraphics) {
    gridLayout = [baseLayoutFn, { index: 0, pos: splitPos }];
  }

  // style setting that components can interpret as they see fit
  const roundedCorners = !!params.useRoundedCornersStyle;

  return (
    <Box id="main">
      <Box
        id="background"
        style={{
          fillColor: 'rgba(90, 0, 0, 1)',
        }}
      />
      <VideoGrid
        layout={gridLayout}
        showLabels={params.showParticipantLabels}
        roundedCorners={roundedCorners}
      />
      {showGraphics ? (
        <TimedExampleGraphics
          layout={graphicsLayout}
          onSide={onSide}
          demoText={params.demoText}
          roundedCorners={roundedCorners}
        />
      ) : null}
    </Box>
  );
}

// --- components ---

const DEFAULT_CORNER_RADIUS_PX = 25;

function VideoGrid({ layout, showLabels, roundedCorners }) {
  const { activeIds, displayNamesById } = useActiveVideo();

  const labelStyle = {
    textColor: 'white',
    fontFamily: 'Roboto',
    fontWeight: '600',
    fontSize_px: 16,
  };
  const videoStyle = {
    cornerRadius_px: roundedCorners ? DEFAULT_CORNER_RADIUS_PX : 0,
  };

  const items = activeIds.map((videoId, i) => {
    const key = 'videogrid_item' + i;

    let participantLabel;
    if (showLabels && activeIds.length > 1) {
      participantLabel = (
        <Text style={labelStyle} layout={[layoutFuncs.offset, { y: -18 }]}>
          {displayNamesById[videoId] || ''}
        </Text>
      );
    }

    return (
      <Box
        key={key}
        id={key}
        layout={[layoutFuncs.grid, { index: i, total: activeIds.length }]}
      >
        <Video src={videoId} style={videoStyle} />
        {participantLabel}
      </Box>
    );
  });

  return (
    <Box id="videogrid" layout={layout}>
      {items}
    </Box>
  );
}

function TimedExampleGraphics({
  onSide,
  layout: baseLayout,
  demoText,
  roundedCorners,
}) {
  const t = useVideoTime();

  // change some properties based on time
  let imageSize = 0.1;
  if (t % 12 > 5) {
    imageSize = 0.15;
  }
  if (t % 12 > 9) {
    imageSize = 0.25;
  }
  let imageLayoutFn = layoutFuncs.cornerBug_topRight;
  if (t % 6 >= 3) {
    imageLayoutFn = layoutFuncs.cornerBug_bottomLeft;
  }

  // "gu" is the grid unit, a device-independent unit.
  // for a 16:9 rendering, the default grid size is 1/36 of the height.
  // in practice, 1 gu is text that's small but still readable on a TV.
  let fontSize_gu = onSide ? 1.8 : 2.5;

  const textStyle = {
    textColor: 'rgba(255, 250, 200, 0.95)',
    fontFamily: 'Roboto',
    fontWeight: '300',
    fontSize_gu,
    //strokeColor: 'rgba(0, 0, 0, 0.95)',
    //strokeWidth_px: 12,
  };
  const textPad_px = 20;

  const boxStyle = {
    fillColor: 'rgba(50, 70, 255, 0.7)',
    //strokeColor: 'rgba(255, 255, 255, 0.8)',
    //strokeWidth_px: 4,
  };
  let boxOuterPad = 0;
  if (roundedCorners) {
    boxStyle.cornerRadius_px = DEFAULT_CORNER_RADIUS_PX;
    boxOuterPad = 20;
  }

  return (
    <Box layout={[layoutFuncs.pad, { pad: boxOuterPad }]}>
      <Box id="graphicsBox" style={boxStyle} layout={baseLayout}>
        <Box layout={[layoutFuncs.pad, { pad: textPad_px }]}>
          <Text style={textStyle} layout={[layoutFuncs.demoText_bottomRight]}>
            {demoText}
          </Text>
        </Box>
        <Image
          src="test_square"
          layout={[imageLayoutFn, { size: imageSize }]}
        />
      </Box>
    </Box>
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

  splitV: (parentFrame, params) => {
    const pos = params.pos || 0.5;
    const idx = params.index || 0;

    const frame = { ...parentFrame };
    if (idx === 0) {
      frame.h = Math.round(parentFrame.h * pos);
    } else {
      frame.h = Math.round(parentFrame.h * (1 - pos));
      frame.y += parentFrame.h - frame.h;
    }
    return frame;
  },

  splitH: (parentFrame, params) => {
    const pos = params.pos || 0.5;
    const idx = params.index || 0;

    const frame = { ...parentFrame };
    if (idx === 0) {
      frame.w = Math.round(parentFrame.w * pos);
    } else {
      frame.w = Math.round(parentFrame.w * (1 - pos));
      frame.x += parentFrame.w - frame.w;
    }
    return frame;
  },

  cornerBug_topRight: (parentFrame, params, layoutCtx) => {
    const margin = cornerBugMargin(layoutCtx);
    const { w, h } = cornerBugSize(params, layoutCtx);

    let { x, y } = parentFrame;
    x += parentFrame.w - w - margin;
    y += margin;

    return { x, y, w, h };
  },

  cornerBug_bottomLeft: (parentFrame, params, layoutCtx) => {
    const margin = cornerBugMargin(layoutCtx);
    const { w, h } = cornerBugSize(params, layoutCtx);

    let { x, y } = parentFrame;
    x += margin;
    y += parentFrame.h - h - margin;

    return { x, y, w, h };
  },

  demoText_bottomRight: (parentFrame, params, layoutCtx) => {
    let { x, y, w, h } = parentFrame;

    const textSize = layoutCtx.useIntrinsicSize();

    // place in bottom-right corner
    w = textSize.w;
    h = textSize.h;
    x += parentFrame.w - w;
    y += parentFrame.h - h;

    return { x, y, w, h };
  },

  grid: (parentFrame, params, layoutCtx) => {
    const { index, total } = params;
    const { viewport } = layoutCtx;

    if (total < 1 || !isFinite(total)) {
      return { ...parentFrame };
    }

    const outputAsp = viewport.w / viewport.h;

    const margin_vh = outputAsp >= 1 ? 0.05 : 0.02; // use smaller margin on portrait
    const outerMargin = total > 1 ? viewport.h * margin_vh : 0;
    const innerMargin = total > 1 ? viewport.h * margin_vh : 0;

    const numCols = total > 9 ? 4 : total > 4 ? 3 : total > 1 ? 2 : 1;
    const numRows = Math.ceil(total / numCols);

    const videoAsp = outputAsp; // assume aspect ratio for video items is same as output
    const parentAsp = parentFrame.w / parentFrame.h;
    const contentAsp = (numCols * videoAsp) / numRows;

    let { x, y, w, h } = parentFrame;
    let itemW, itemH;

    // item size depends on whether our content is wider or narrower than the parent frame
    if (contentAsp >= parentAsp) {
      itemW =
        (parentFrame.w - 2 * outerMargin - (numCols - 1) * innerMargin) /
        numCols;
      itemH = itemW / videoAsp;

      // center grid vertically
      x += outerMargin;
      y +=
        (parentFrame.h - (numRows * itemH + innerMargin * (numRows - 1))) / 2;
    } else {
      itemH =
        (parentFrame.h - 2 * outerMargin - (numRows - 1) * innerMargin) /
        numRows;
      itemW = itemH * videoAsp;

      // center grid horizontally
      y += outerMargin;
      x +=
        (parentFrame.w - (numCols * itemW + innerMargin * (numCols - 1))) / 2;
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
  },
};

function cornerBugSize(params, layoutCtx) {
  // 'size' param is in proportion to viewport height
  const h = layoutCtx.viewport.h * params.size;
  const w = h;
  return { w, h };
}

function cornerBugMargin(layoutCtx) {
  return layoutCtx.viewport.h * 0.05;
}
