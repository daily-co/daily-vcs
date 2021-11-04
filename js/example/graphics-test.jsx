import * as React from 'react';
import {Box, Image, Label, Video} from '../src/react/components';


export const compositionInterface = {
  displayMeta: {
    name: "Graphics test",
    description: "Simple test: renders random graphics",
  },
  modes: [
  ],
  params: [
  ]
};


export default function GraphicsTestComposition() {
  return (
    <Box id="main">
      <Video src={0} />
      <RandomGraphics />
    </Box>
  )
}

function RandomGraphics() {
  const items = [];

  const textStyle = {
    textColor: 'rgba(255, 250, 200, 0.93)',
    fontFamily: 'Helvetica',
    fontWeight: '200',
    fontSize_px: 32,
  };

  for (let i = 0; i < 50; i++) {
    const pos = {
      x: Math.round(Math.random()*1000),
      y: Math.round(Math.random()*600)
    };
    const trs = {
      rotate_deg: (-8 + Math.random()*16)
    };
    const style = {
      fillColor: `rgba(${Math.round(Math.random()*255)}, ${Math.round(Math.random()*255)}, `+
                 `${55 + Math.round(Math.random()*200)}, ${(0.5 + Math.random()*0.5).toFixed(2)})`
    }
    items.push(
      <Box key={i} layout={[layoutFuncs.demoBox, pos]} style={style} transform={trs}>
        <Label style={textStyle}>Hello random {i+1}</Label>
      </Box>
    );
  }

  return (
    <Box id="graphics">
      {items}
    </Box>
  )
}

const layoutFuncs = {
  demoBox: (parentFrame, params) => {
    let {x, y, w, h} = parentFrame;
    
    x += params.x || 0;
    y += params.y || 0;
    w = 300;
    h = 90;

    return {x, y, w, h};
  },
};
