import * as React from 'react';
import { Box, Image } from '#vcs-react/components';
import { useVideoTime } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';

export default function Slate({
  src,
  opacity = 1,
  enableFade = true,
  show = false,
}) {
  const t = useVideoTime();

  // TODO: the fade logic below is the same as in ImageOverlay.
  // should refactor into a hook shared by both components.

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
    const fadeDur = 0.25;
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

  const bgStyle = {
    fillColor: 'black',
  };

  const contents = [];
  let ci = 0;
  if (src) {
    contents.push(<Image src={src} key={++ci} />);
  }

  return (
    <Box style={bgStyle} blend={{ opacity }}>
      {contents}
    </Box>
  );
}
