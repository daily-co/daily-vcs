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

  return <Image src={src} layout={layout} />;
}
