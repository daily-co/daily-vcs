import * as React from 'react';
import { Box, Image, Text } from '#vcs-react/components';
import { useVideoTime, useViewportSize } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';

const FADE_DUR = 0.25;

export default function Slate({
  src,
  opacity = 1,
  enableFade = true,
  show = false,
  isOpeningSlate = false,
  openingWaitTime = 4,
  bgColor = 'black',
  textColor = 'white',
  title = '',
  subtitle = '',
  titleStyle = {},
  subtitleStyle = {},
}) {
  const t = useVideoTime();
  const viewportSize = useViewportSize();

  // TODO: the fade logic below is the same as in ImageOverlay.
  // should refactor into a hook shared by both components.

  // this component needs to keep track of when it was toggled on/off
  // so we can render the fade in/out operation for this graphic.
  // default value for "time last toggled" is negative infinity
  // so the fade transition logic works right.
  // if this is an opening slate, we effectively fade out the slate
  // at 'openingWaitTime' in the future.
  const lastToggledRef = React.useRef({
    show,
    t: -Infinity,
  });

  if (isOpeningSlate) {
    // the opening slate gets shown only at the start of the timeline.
    // toggling it on and off won't make a difference.
    // if the time is past, don't render.
    const slateOutT = openingWaitTime + FADE_DUR;
    if (t > slateOutT) {
      return null;
    } else if (t >= openingWaitTime) {
      show = false;
      lastToggledRef.current = { show, t: openingWaitTime };
    }
  } else {
    if (lastToggledRef.current.show !== show) {
      // graphic has been toggled, record this time
      lastToggledRef.current = { show, t };
    }

    if (!enableFade && !show) {
      // without fade, we can just bail if this graphic is toggled off
      return null;
    }
  }

  opacity = Math.max(0, Math.min(1, opacity));

  if (enableFade) {
    const fadeDur = FADE_DUR;
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
    fillColor: bgColor,
  };

  const contents = [];
  let ci = 0;
  if (src) {
    contents.push(<Image src={src} key={++ci} />);
  }

  if (title && title.length > 0) {
    contents.push(
      <Text
        key={++ci}
        style={{ ...titleStyle, textAlign: 'center' }}
        layout={[layoutFuncs.placeText, { vAlign: 'center' }]}
      >
        {title}
      </Text>
    );
  }
  if (subtitle && subtitle.length > 0) {
    contents.push(
      <Box
        key={++ci}
        layout={[layoutFuncs.splitHorizontal, { index: 1, pos: 0.4 }]}
      >
        <Text
          style={{ ...subtitleStyle, textAlign: 'center' }}
          layout={[layoutFuncs.placeText, { vAlign: 'center' }]}
        >
          {subtitle}
        </Text>
      </Box>
    );
  }

  return (
    <Box style={bgStyle} blend={{ opacity }}>
      {contents}
    </Box>
  );
}
