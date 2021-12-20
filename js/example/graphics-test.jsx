import * as React from 'react';
import { Box, Label, Video } from '#vcs-react/components';
import * as Rand from 'random-seed';

export const compositionInterface = {
  displayMeta: {
    name: 'Graphics test',
    description: 'Simple test: renders random graphics',
  },
  modes: [],
  params: [],
};

export default function GraphicsTestComposition() {
  return (
    <Box id="main">
      <Video src={0} />
      <RandomGraphics />
    </Box>
  );
}

function RandomGraphics() {
  const items = [];

  // instead of Math.random, use a seedable PRNG so we get a repeating sequence
  // and can use this composition in automated tests.
  const rndRef = React.useRef(Rand.create('this is the random seed'));
  const rnd = rndRef.current;

  const textStyle = {
    textColor: 'rgba(255, 250, 200, 0.93)',
    fontFamily: 'Roboto',
    fontWeight: '200',
    fontSize_px: 32,
  };

  for (let i = 0; i < 50; i++) {
    const pos = {
      x: Math.round(rnd.random() * 1000),
      y: Math.round(rnd.random() * 600),
    };
    const trs = {
      rotate_deg: -8 + rnd.random() * 16,
    };
    const style = {
      fillColor:
        `rgba(${Math.round(rnd.random() * 255)}, ${Math.round(
          rnd.random() * 255
        )}, ` +
        `${55 + Math.round(rnd.random() * 200)}, ${(
          0.5 +
          rnd.random() * 0.5
        ).toFixed(2)})`,
    };
    items.push(
      <Box
        key={i}
        layout={[layoutFuncs.demoBox, pos]}
        style={style}
        transform={trs}
      >
        <Label style={textStyle}>Hello random {i + 1}</Label>
      </Box>
    );
  }

  return <Box id="graphics">{items}</Box>;
}

const layoutFuncs = {
  demoBox: (parentFrame, params) => {
    let { x, y, w, h } = parentFrame;

    x += params.x || 0;
    y += params.y || 0;
    w = 300;
    h = 90;

    return { x, y, w, h };
  },
};
