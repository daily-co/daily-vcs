const state = {
  activeVideoInputSlots: [true, true],
  params: {
    showGraphics: true,
    useRoundedCornersStyle: true,
    demoText: 'Hello from test scenario',
  },
};

const durationInFrames = 350;

const outputFrames = [0, 180, 190, 200, 340];

function frameWillRenderCb(frameIdx) {
  let didUpdate = false;
  if (frameIdx === outputFrames[1]) {
    state.activeVideoInputSlots.push(true);

    // change text to show some emoji
    state.params.demoText = 'Emoji: 😭,😎🥶,🎱📱💚.';

    didUpdate = true;
  } else if (frameIdx === outputFrames[2]) {
    state.activeVideoInputSlots.push(true);
    state.params.graphicsOnSide = true;
    didUpdate = true;
  } else if (frameIdx === outputFrames[3]) {
    state.activeVideoInputSlots.push(true);
    didUpdate = true;
  } else if (frameIdx === outputFrames[4]) {
    state.activeVideoInputSlots.push(true);

    state.activeVideoInputSlots[1] = false; // remove an existing participant

    state.params.fitGridToGraphics = true;
    didUpdate = true;
  }

  return didUpdate ? { ...state } : null;
}

export default {
  compositionId: 'example:hello',
  durationInFrames,
  outputFrames,
  initialState: { ...state },
  frameWillRenderCb,
};
