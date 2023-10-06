import * as React from 'react';
import { WebFrame } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { useFade } from './useFade.js';

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
  keyPressActionKey = 0,
  keyPressActionName = '',
  keyPressModifiers = '',
}) {
  opacity = useFade({ enableFade, show, opacity, fadeDuration: 0.35 });
  if (!opacity) return null;

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
      keyPressAction={{
        name: keyPressActionName,
        key: keyPressActionKey,
        modifiers: keyPressModifiers,
      }}
    />
  );
}
