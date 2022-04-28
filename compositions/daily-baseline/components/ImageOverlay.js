import * as React from 'react';
import { Image } from '#vcs-react/components';
import { useVideoTime } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';

export default function ImageOverlay({
  src = 'overlay.png',
  positionCorner,
  aspectRatio,
  height_vh,
  margin_vh,
  fullScreen,
  opacity = 1,
  enableFade = false,
  show = false,
}) {
  const t = useVideoTime();

  // this component needs to keep track of when it was toggled on/off
  // so we can render the fade in/out operation for this graphic
  const lastToggledRef = React.useRef({
    show,
    t,
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
    const layoutProps = {
      positionCorner,
      aspectRatio,
      height_vh,
      margin_vh,
    };
    layout = [layoutFuncs.pip, layoutProps];
  }

  return <Image src={src} layout={layout} blend={{ opacity }} />;
}
