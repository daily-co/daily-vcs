const state = {
  activeParticipants: [true, true],
  params: {
    showGraphics: true,
    demoText: "Hello from test scenario"
  },
};

function frameWillRenderCb(frameIdx) {
  let didUpdate = false;
  if (frameIdx === 5) {
    state.activeParticipants.push(true);
    didUpdate = true;
  }
  if (frameIdx === 10) {
    state.activeParticipants.push(true);
    state.params.graphicsOnSide = true;
    didUpdate = true;
  }
  if (frameIdx === 15) {
    state.activeParticipants.push(true);
    didUpdate = true;
  }
  if (frameIdx === 20) {
    state.params.fitGridToGraphics = true;
    didUpdate = true;
  }

  return (didUpdate) ? {...state} : null;
}

export default {
  compositionId: "hello",
  durationInFrames: 25,
  outputFrames: [ 0, 5, 10, 15, 20 ],
  initialState: {...state},
  frameWillRenderCb
};
