import * as React from 'react';
import { useVideoTime } from '#vcs-react/hooks';

export function useFade({
  enableFade,
  show,
  opacity = 1,
  fadeDuration = 0.35,
}) {
  const t = useVideoTime();

  // the 'show' boolean is needed because we must keep track of
  // when a component using this hook was toggled on/off
  // so we can compute the opacity value for the fade in/out.
  // default value for "time last toggled" is negative infinity
  // so the fade transition logic works right.
  const lastToggledRef = React.useRef({
    show,
    t: -Infinity,
  });

  if (lastToggledRef.current.show !== show) {
    // component visibility has been toggled, record this time
    lastToggledRef.current = { show, t };
  }

  if (!enableFade && !show) {
    // without fade, we can just bail if the component is toggled off
    return 0;
  }

  opacity = Math.max(0, Math.min(1, opacity));

  if (enableFade) {
    const tInFade = t - lastToggledRef.current.t;
    const fadePos = Math.min(1, tInFade / fadeDuration);
    if (show) {
      // fade in
      opacity *= fadePos;
    } else {
      // fade out
      opacity *= 1 - fadePos;
    }
  }

  if (opacity < 1 / 255) return 0;

  return opacity;
}
