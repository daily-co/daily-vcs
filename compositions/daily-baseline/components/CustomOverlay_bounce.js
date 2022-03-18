import * as React from 'react';
import { Image } from '#vcs-react/components';
import { useVideoTime } from '#vcs-react/hooks';

/*
  An example component that can be used to test session assets.

  Renders the classic DVD screensaver bouncing logo.

  Replace CustomOverlay.js with this one (via the session asset API)
  for 1990s set-top player vibes.
*/

let IMG_NAME, IMG_ASP;
if (1) {
  // default testing image, always available
  IMG_NAME = 'test_square';
  IMG_ASP = 1;
} else {
  // this image is expected to be provided in session assets
  IMG_NAME = 'dvdlogo.png';
  IMG_ASP = 480 / 212;
}

// we don't know the exact output rate in VCS,
// but our modest bounce generally doesn't need to run at full rate,
// so limit the update rate in our component to this.
const FPS = 1 / 20;

// computes new animation position with bounce at edges
function updateAnim(prev, t, frame) {
  const dT = t - prev.t;
  const speed = 0.1;
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

  return {
    t,
    frame,
    pos,
    dir,
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
      style={{ opacity: animRef.current.opacity }}
      layout={[placeImage, animRef.current.pos]}
    />
  );
}

function placeImage(parentFrame, params) {
  let { x, y, w, h } = parentFrame;

  // image size is fixed at 20% of parent's height.
  // image aspect ratio is hardcoded currently.
  h = parentFrame.h * 0.2;
  w = h * IMG_ASP;

  // params x/y is a relative position with coords in range [0-1[.
  // place the image so it's always inside the available space.
  x += Math.round(params.x * (parentFrame.w - w));
  y += Math.round(params.y * (parentFrame.h - h));

  return { x, y, w, h };
}
