// Test scenario for stretchbox layout animations.
// Verifies that the animation system interpolates frame values correctly
// when layout params change.
//
// The stretchbox composition has a 0.3s EASE_OUT animation on its main container.
// At 30fps, 0.3s = 9 frames.
//
// Frame timeline:
//   0: Initial state
//  30: Text content changes, triggering a size change and animation (frames 30-39)
//  35: Mid-animation capture - values should be INTERPOLATED between start and end
//  45: Post-animation capture - animation complete, final values
//
// The key verification is that frame 35 shows intermediate values different from
// both frame 30 and frame 45, proving the animation interpolation is working.

const state = {
  activeVideoInputSlots: [true],
  params: {
    textContent: 'Short',
    maxBoxWidth_gu: 24,
    iconSize_gu: 5,
  },
};

const durationInFrames = 60;

// Frames to capture for comparison
const outputFrames = [0, 30, 35, 45];

function frameWillRenderCb(frameIdx) {
  let didUpdate = false;

  if (frameIdx === 30) {
    // Trigger animation by changing text content (causes size change)
    state.params.textContent = 'This is a much longer text that will make the box grow significantly in size';
    didUpdate = true;
  }

  return didUpdate ? { ...state } : null;
}

export default {
  compositionId: 'example:stretchbox',
  durationInFrames,
  outputFrames,
  initialState: { ...state },
  frameWillRenderCb,
};
