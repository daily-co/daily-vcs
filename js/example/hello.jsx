import * as React from 'react';
import {Box, Image, Video} from '../src/react/components';
import {useVideoTime} from '../src/react/hooks';


// the root component of this composition
export default function HelloDailyVCS() {
  const t = useVideoTime();

  console.log("rendering hello comp at t = %s", t)

  let imageLayoutFn = layoutFuncs.cornerBug_topRight;
  if (t % 6 >= 3) {
    imageLayoutFn = layoutFuncs.cornerBug_bottomLeft;    
  }
  let imageSize = 0.1;
  if (t > 5) {
    imageSize = 0.15;
  }

  return (
    <Box id="main">
      <Video id="video1" />
      <Box id="imageBg" style={{fillColor: '#22e'}} layout={[layoutFuncs.lowerThird]}>
        <Image id="image1" src="test_square" layout={[imageLayoutFn, {size: imageSize}]} />
      </Box>
    </Box>
  )
}

// the interface exposed by this composition.
// these values can be set at runtime and become available in a context.
export const compositionInterface = {
  modes: [
    "grid",
    "dominant"
  ],
  params: [
  ]
};


// --- layout utils ---

function cornerBugSize(viewport, params) {
  // 'size' param is in proportion to viewport height
  const h = viewport.h * params.size;
  const w = h;
  return {w, h};
}

function cornerBugMargin(viewport) {
  return viewport.h * 0.05;
}

const layoutFuncs = {
  lowerThird: (parentFrame) => {
    const frame = {...parentFrame};
    frame.h = Math.round(parentFrame.h / 3);
    frame.y += parentFrame.h - frame.h;
    return frame;
  },

  cornerBug_topRight: (parentFrame, viewport, params) => {
    const margin = cornerBugMargin(viewport);
    const {w, h} = cornerBugSize(viewport, params);

    let {x, y} = parentFrame;
    x += parentFrame.w - w - margin;
    y += margin;

    return {x, y, w, h};
  },

  cornerBug_bottomLeft: (parentFrame, viewport, params) => {
    const margin = cornerBugMargin(viewport);
    const {w, h} = cornerBugSize(viewport, params);

    let {x, y} = parentFrame;
    x += margin;
    y += parentFrame.h - h - margin;

    return {x, y, w, h};
  },
};

