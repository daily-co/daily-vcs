const state = {
  activeParticipants: [true, true],
  params: {
    showGraphics: true,
    demoText: "Hello from test scenario"
  },
};

const durationInFrames = 350;

const outputFrames = [ 0, 180, 190, 200, 340 ];

function frameWillRenderCb(frameIdx) {
  let didUpdate = false;
  if (frameIdx === outputFrames[1]) {
    state.activeParticipants.push(true);
    didUpdate = true;
  }
  else if (frameIdx === outputFrames[2]) {
    state.activeParticipants.push(true);
    state.params.graphicsOnSide = true;
    didUpdate = true;
  }
  else if (frameIdx === outputFrames[3]) {
    state.activeParticipants.push(true);
    didUpdate = true;
  }
  else if (frameIdx === outputFrames[4]) {
    state.activeParticipants.push(true);
    
    state.activeParticipants[1] = false; // remove an existing participant

    state.params.fitGridToGraphics = true;
    didUpdate = true;
  }

  return (didUpdate) ? {...state} : null;
}

export default {
  compositionId: "hello",
  durationInFrames,
  outputFrames,
  initialState: {...state},
  frameWillRenderCb
};
