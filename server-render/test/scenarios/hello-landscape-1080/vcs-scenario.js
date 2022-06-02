const state = {
  activeVideoInputSlots: [true, true],
  params: {
    showGraphics: true,
    demoText: 'Hello from test @ landscape 1080',
  },
};

const durationInFrames = 5;

const outputFrames = [0];

const outputSize = { w: 1920, h: 1080 };

function frameWillRenderCb(frameIdx) {
  let didUpdate = false;

  return didUpdate ? { ...state } : null;
}

export default {
  compositionId: 'example:hello',
  durationInFrames,
  outputFrames,
  outputSize,
  initialState: { ...state },
  frameWillRenderCb,
};
