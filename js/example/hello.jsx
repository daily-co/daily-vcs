import * as React from 'react';
import {Box, Image, Video} from '../src/react/components';
import {useVideoTime, useVideoCall} from '../src/react/hooks';


// the root component of this composition
export default function HelloDailyVCS() {
  return (
    <Box id="main">
      <VideoGrid />
      <TimedExampleGraphics />
    </Box>
  )
}

// the control interface exposed by this composition.
// these values can be set at runtime and become available in the externalData context.
export const compositionInterface = {
  displayMeta: {
    name: "Hello Daily",
    description: "An example composition in a single file",
  },
  modes: [
    "grid",
  ],
  params: [
    {
      id: "showGraphics",
      type: "boolean",
      defaultValue: true,
    },
    {
      id: "demoAnimation",
      type: "boolean",
      defaultValue: false,
    },
  ]
};


// --- components ---

function VideoGrid() {
  const {activeParticipants} = useVideoCall();

  let maxParticipants = activeParticipants.length;
  let activeIndexes = [];
  let n = 0;
  for (let i = 0; i < maxParticipants; i++) {
    if (activeParticipants[i]) {
      activeIndexes.push(i);
      n++;
    }
  }

  return (
    <Box id="videogrid">
      {activeIndexes.map((srcIdx, i) => {
        const key = 'videogrid_'+i;
        return <Video
          src={srcIdx} key={key} id={key}
          layout={[layoutFuncs.grid, {index: i, total: n}]}
        />;
      })}
    </Box>
  );
}

function TimedExampleGraphics() {
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

  return (
    <Box id="imageBg" style={{fillColor: 'rgba(50, 70, 255, 0.7)'}} layout={[layoutFuncs.lowerThird]}>
      <Image id="image1" src="test_square" layout={[imageLayoutFn, {size: imageSize}]} />
    </Box>
  );
}


// --- layout utils ---

function cornerBugSize(params, layoutCtx) {
  // 'size' param is in proportion to viewport height
  const h = layoutCtx.viewport.h * params.size;
  const w = h;
  return {w, h};
}

function cornerBugMargin(layoutCtx) {
  return layoutCtx.viewport.h * 0.05;
}

const layoutFuncs = {
  lowerThird: (parentFrame) => {
    const frame = {...parentFrame};
    frame.h = Math.round(parentFrame.h / 3);
    frame.y += parentFrame.h - frame.h;
    return frame;
  },

  cornerBug_topRight: (parentFrame, params, layoutCtx) => {
    const margin = cornerBugMargin(layoutCtx);
    const {w, h} = cornerBugSize(params, layoutCtx);

    let {x, y} = parentFrame;
    x += parentFrame.w - w - margin;
    y += margin;

    return {x, y, w, h};
  },

  cornerBug_bottomLeft: (parentFrame, params, layoutCtx) => {
    const margin = cornerBugMargin(layoutCtx);
    const {w, h} = cornerBugSize(params, layoutCtx);

    let {x, y} = parentFrame;
    x += margin;
    y += parentFrame.h - h - margin;

    return {x, y, w, h};
  },

  grid: (parentFrame, params, layoutCtx) => {
    const {index, total} = params;
    const {viewport} = layoutCtx;

    if (total < 1 || !isFinite(total)) {
      return {...parentFrame};
    }

    const numCols = (total > 9) ? 4 : (total > 4) ? 3 : (total > 1) ? 2 : 1;
    const numRows = Math.ceil(total / numCols);

    // for proto, hardcoded video item aspect ratio
    const asp = 16 / 9;

    const outerMargin = total > 1 ? viewport.h*0.05 : 0;
    const innerMargin = total > 1 ? viewport.h*0.05 : 0;

    const itemW = (parentFrame.w - 2*outerMargin - (numCols - 1)*innerMargin) / numCols;
    const itemH = itemW / asp;

    let {x, y, w, h} = parentFrame;

    x += outerMargin;

    // center grid vertically
    y += (parentFrame.h - (numRows*itemH + innerMargin*(numRows - 1))) / 2;

    const col = index % numCols;
    const row = Math.floor(index / numCols);

    x += col * itemW;
    x += col * innerMargin;

    y += row * itemH;
    y += row * innerMargin;

    w = itemW;
    h = itemH;

    //console.log("computing grid %d / %d, rows/cols %d, %d: ", index, total, numRows, numCols, x, y);

    return {x, y, w, h};
  },
};

