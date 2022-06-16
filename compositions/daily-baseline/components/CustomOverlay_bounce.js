import * as React from 'react';
import { Image } from '#vcs-react/components';
import { useVideoTime } from '#vcs-react/hooks';

/*
  An example component that can be used to test session assets.

  Renders the classic DVD screensaver bouncing logo.

  Replace CustomOverlay.js with this one (via the session asset API)
  for 1990s set-top player vibes.
*/

const IMG_NAME = 'test_square'; // default testing image, always available
// 'overlay.png';
// 'dvdlogo.png';  // this image is expected to be provided in session assets

// we don't know the exact output rate in VCS,
// but our modest bounce generally doesn't need to run at full rate,
// so limit the update rate in our component to this.
const FPS = 1 / 20;

const ANIM_SPEED = 0.1;

// computes new animation position with bounce at edges
function updateAnim(prev, t, frame) {
  const dT = t - prev.t;
  const speed = ANIM_SPEED;
  const pos = {
    x: prev.pos.x + prev.dir.x * speed * dT,
    y: prev.pos.y + prev.dir.y * speed * dT,
  };
  const dir = { ...prev.dir };
  if (pos.x >= 1 || pos.x <= 0) {
    pos.x = Math.min(1, Math.max(0, pos.x));
    dir.x *= -1;
  }
  if (pos.y >= 1 || pos.y <= 0) {
    pos.y = Math.min(1, Math.max(0, pos.y));
    dir.y *= -1;
  }
  const opacity = prev.opacity;

  return {
    t,
    frame,
    pos,
    dir,
    opacity,
  };
}

export default function CustomOverlay() {
  // our animation state
  const animRef = React.useRef({
    t: -1,
    frame: -1,
    pos: {
      x: Math.random(),
      y: Math.random(),
    },
    dir: {
      x: 1,
      y: 1,
    },
    opacity: 0.5,
  });

  const t = useVideoTime();
  const intv = FPS; // seconds between animation updates
  const frame = Math.floor(t / intv);

  if (frame !== animRef.current.frame) {
    animRef.current = updateAnim(animRef.current, t, frame);
  }

  return (
    <Image
      src={IMG_NAME}
      blend={{ opacity: animRef.current.opacity }}
      layout={[placeImage, animRef.current.pos]}
    />
  );
}

function placeImage(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;

  // get the source image aspect ratio using a layout system hook
  const imgSize = layoutCtx.useIntrinsicSize();
  const imgAsp = imgSize.h > 0 ? imgSize.w / imgSize.h : 1;

  // image size is fixed at 20% of parent's height
  h = parentFrame.h * 0.2;
  w = h * imgAsp;

  // params x/y is a relative position with coords in range [0-1[.
  // place the image so it's always inside the available space.
  x += params.x * (parentFrame.w - w);
  y += params.y * (parentFrame.h - h);

  return { x, y, w, h };
}
