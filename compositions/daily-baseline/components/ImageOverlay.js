import * as React from 'react';
import { Image } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';

export default function ImageOverlay({
  src = 'overlay.png',
  positionCorner,
  aspectRatio,
  height_vh,
  margin_vh,
  fullScreen,
  opacity = 1,
}) {
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

  opacity = Math.max(0, Math.min(1, opacity));

  return <Image src={src} layout={layout} blend={{ opacity }} />;
}
