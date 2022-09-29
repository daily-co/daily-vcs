import * as React from 'react';
import { WebFrame } from '#vcs-react/components';
import { useVideoTime } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';

// this component is a copy of ImageOverlay.
//
// TODO: refactor the shared fade-in/out code into a hook
//
// TOOD: webframe should probably default to a slight delay before fade-in, to hide URL loading state
//
export default function WebFrameOverlay({
  src = '', // default to no URL displayed
  viewportWidth_px = 1280,
  viewportHeight_px = 720,
  positionCorner,
  height_gu,
  margin_gu,
  fullScreen,
  opacity = 1,
  enableFade = false,
  show = false,
}) {
  const t = useVideoTime();

  // this component needs to keep track of when it was toggled on/off
  // so we can render the fade in/out operation for this graphic.
  // default value for "time last toggled" is negative infinity
  // so the fade transition logic works right.
  const lastToggledRef = React.useRef({
    show,
    t: -Infinity,
  });

  if (lastToggledRef.current.show !== show) {
    // graphic has been toggled, record this time
    lastToggledRef.current = { show, t };
  }

  if (!enableFade && !show) {
    // without fade, we can just bail if this graphic is toggled off
    return null;
  }

  opacity = Math.max(0, Math.min(1, opacity));

  if (enableFade) {
    const fadeDur = 0.35;
    const tInFade = t - lastToggledRef.current.t;
    const fadePos = Math.min(1, tInFade / fadeDur);
    if (show) {
      // fade in
      opacity *= fadePos;
    } else {
      // fade out
      opacity *= 1 - fadePos;
    }
  }

  if (opacity < 0.001) return null;

  let layout;
  if (!fullScreen) {
    const aspectRatio =
      viewportHeight_px > 0 ? viewportWidth_px / viewportHeight_px : 1;

    const layoutProps = {
      positionCorner,
      aspectRatio,
      height_gu,
      margin_gu,
    };
    layout = [layoutFuncs.pip, layoutProps];
  }

  return (
    <WebFrame
      src={src}
      viewportSize={{ w: viewportWidth_px, h: viewportHeight_px }}
      layout={layout}
      blend={{ opacity }}
    />
  );
}
