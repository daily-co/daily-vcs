import * as React from 'react';
import { Image } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { useFade } from './useFade.js';

export default function ImageOverlay({
  src = 'overlay.png',
  positionCorner,
  aspectRatio,
  height_gu,
  margin_gu,
  fullScreen,
  fullScreenScaleMode = 'fit',
  opacity = 1,
  enableFade = false,
  show = false,
}) {
  opacity = useFade({ enableFade, show, opacity, fadeDuration: 0.35 });
  if (!opacity) return null;

  let layout;
  let scaleMode = 'fit';
  if (fullScreen) {
    scaleMode = fullScreenScaleMode;
  } else {
    const layoutProps = {
      positionCorner,
      aspectRatio,
      height_gu,
      margin_gu,
    };
    layout = [layoutFuncs.pip, layoutProps];
  }

  return (
    <Image
      src={src}
      layout={layout}
      blend={{ opacity }}
      scaleMode={scaleMode}
    />
  );
}
