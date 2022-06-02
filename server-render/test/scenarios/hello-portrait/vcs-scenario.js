const state = {
  activeVideoInputSlots: [true, true],
  params: {
    showGraphics: true,
    demoText: 'Hello from test @ portrait 720x1280',
  },
};

const durationInFrames = 5;

const outputFrames = [0];

const outputSize = { w: 720, h: 1280 };

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
