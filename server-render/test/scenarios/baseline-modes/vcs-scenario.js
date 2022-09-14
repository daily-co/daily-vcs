const state = {
  activeVideoInputSlots: [true, true, true, true],
  params: {
    mode: 'grid',
  },
};

const outputSize = { w: 1280, h: 720 };

const outputFrames = [0, 10, 20, 30, 40, 50, 60, 70, 80];
const kFrameIdx_mode_dominant = outputFrames[1];
const kFrameIdx_mode_dominant_2 = outputFrames[2];
const kFrameIdx_mode_pip = outputFrames[3];
const kFrameIdx_mode_pip_2 = outputFrames[4];
const kFrameIdx_mode_split = outputFrames[5];
const kFrameIdx_mode_single = outputFrames[6];
const kFrameIdx_mode_single_2 = outputFrames[7];
const kFrameIdx_mode_grid_2 = outputFrames[8];

const durationInFrames = 1 + outputFrames[outputFrames.length - 1];

function frameWillRenderCb(frameIdx) {
  let didUpdate = false;

  switch (frameIdx) {
    case kFrameIdx_mode_dominant:
      state.params.mode = 'dominant';
      didUpdate = true;
      break;

    case kFrameIdx_mode_dominant_2:
      state.params = {
        ...state.params,
        'videoSettings.dominant.position': 'right',
        'videoSettings.dominant.splitPos': 0.85,
        'videoSettings.dominant.itemInterval_gu': 0.3,
        'videoSettings.dominant.outerPadding_gu': 0,
        'videoSettings.scaleMode': 'fit',
      };
      state.activeVideoInputSlots[1] = {
        dominant: true,
      };
      didUpdate = true;
      break;

    case kFrameIdx_mode_pip:
      state.params = {
        mode: 'pip',
        'videoSettings.scaleMode': 'fill',
      };
      // input slot 1 is set as dominant,
      // but 'videoSettings.pip.followDomFlag' is off by default
      didUpdate = true;
      break;

    case kFrameIdx_mode_pip_2:
      state.params = {
        mode: 'pip',
        'videoSettings.pip.position': 'bottom-left',
        'videoSettings.pip.aspectRatio': 1.2,
        'videoSettings.pip.height_gu': 17,
        'videoSettings.pip.margin_gu': 2,
        // enabling followDomFlag, so input slot #1 should now receive priority
        'videoSettings.pip.followDomFlag': true,
      };
      didUpdate = true;
      break;

    case kFrameIdx_mode_split:
      state.params = {
        mode: 'split',
      };
      // reset the inputs so split is rendering #2 and #3
      state.activeVideoInputSlots[0] = false;
      state.activeVideoInputSlots[1] = false;
      state.activeVideoInputSlots[2] = true;
      state.activeVideoInputSlots[3] = true;
      didUpdate = true;
      break;

    case kFrameIdx_mode_single:
      state.params.mode = 'single';
      didUpdate = true;
      break;

    case kFrameIdx_mode_single_2:
      state.params.mode = 'single';
      // we're now left with only input #3 enabled
      state.activeVideoInputSlots[2] = false;
      didUpdate = true;
      break;

    case kFrameIdx_mode_grid_2:
      state.params = {
        mode: 'grid',
      };

      // back in grid mode, enable a bunch of slots
      for (let i = 4; i < 16; i++) {
        state.activeVideoInputSlots[i] = true;
      }
      didUpdate = true;
      break;
  }

  return didUpdate ? { ...state } : null;
}

export default {
  compositionId: 'daily:baseline',
  durationInFrames,
  outputFrames,
  outputSize,
  initialState: { ...state },
  frameWillRenderCb,
};
