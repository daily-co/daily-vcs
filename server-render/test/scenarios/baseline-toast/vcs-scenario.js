const state = {
  activeVideoInputSlots: [true, true, true, true],
  params: {
    mode: 'grid',
  },
};

const outputSize = { w: 1280, h: 720 };

const outputFrames = [10, 20, 60, 110, 130, 180];
const kFrameIdx_toast1 = outputFrames[0];
const kFrameIdx_toast2 = outputFrames[4] - 1; // send one frame early so we get the anim first frame

const durationInFrames = 1 + outputFrames[outputFrames.length - 1];

let toastKey = 1;
let toastText = 'First toast';

function frameWillRenderCb(frameIdx) {
  let didUpdate = false;

  switch (frameIdx) {
    case kFrameIdx_toast1:
      state.params = {
        ...state.params,
        'toast.source': 'param',
        'toast.color': 'rgba(215, 50, 110, 0.8)',
        'toast.duration_secs': 3,
        'toast.key': toastKey,
        'toast.icon.assetName': 'test_square_320px',
        'toast.text': toastText,
        'toast.text.fontFamily': 'Bitter',
        'toast.text.fontSize_pct': 150,
        'toast.text.fontWeight': '400',
        'toast.showIcon': false,
      };
      toastKey++;
      didUpdate = true;
      break;

    case kFrameIdx_toast2:
      toastText = 'Second toast lorem ipsum';
      state.params = {
        ...state.params,
        'toast.text': toastText,
        'toast.key': toastKey,
      };
      toastKey++;
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
