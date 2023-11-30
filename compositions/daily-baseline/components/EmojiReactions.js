import * as React from 'react';
import { Box, Emoji } from '#vcs-react/components';
import { useVideoTime, useGrid } from '#vcs-react/hooks';
import { v4 as uuidv4 } from 'uuid';

// sample emojis for demo mode
const kDemojis = ['😍', '🤠', '🔥', '🎈', '💖', '👍'];

class EmojiParticle {
  constructor(value, size_gu, startT, gu) {
    this.uuid = uuidv4();

    this.value = value;
    this.size = size_gu * gu;
    this.startT = startT;
    this.gu = gu;

    this.startPos = Math.random() * -gu;
    this.speed = gu * 9 + Math.random() * gu * 5;

    this.startOpacity = 1;
    this.fadeSpeed = 0.3 + Math.random() * 0.1;

    this.startX = (Math.random() - 0.5) * gu * 5;
    this.waveLen = 1.5 + Math.random() * 0.5;
    this.waveSize = gu;
    this.wavePhase = Math.random();

    this.pos = 0;
    this.xOffset = this.startX;
    this.opacity = this.startOpacity;
  }

  advanceTo(t) {
    const td = t - this.startT;

    this.pos = this.startPos + td * this.speed;

    this.xOffset =
      this.startX +
      this.waveSize * Math.sin(this.wavePhase + td * (Math.PI / this.waveLen));

    let op = this.startOpacity - td * this.fadeSpeed;
    op = Math.max(0, op);
    if (op > 0) {
      op = Math.pow(op, 1 / 2.5); // adjust with power curve so fadeout is nonlinear
    }
    this.opacity = op;
  }
}

class EmojiSystem {
  constructor(t, defaultSize, gu) {
    this.t = Number.isFinite(t) ? t : -1;
    this.defaultSize = defaultSize || 1;
    this.gu = gu || 20;

    this.sizeVariance = this.defaultSize * 0.1;

    this.particles = [];

    // map where keys are item keys and values are time when key was handled.
    // the time is necessary so we can prune this map
    this.keysHandled = new Map();

    // alternate mode where keys are numeric, > 0 and increasing,
    // so we can check for new keys with a simple compare
    this.lastNumericKey = 0;
  }

  setTime(t) {
    if (t <= this.t) return;

    this.t = t;

    for (const p of this.particles) {
      p.advanceTo(this.t);
    }
  }

  addItem(value, size) {
    if (!size) {
      size =
        this.defaultSize -
        this.sizeVariance / 2 +
        Math.random() * this.sizeVariance;
    }

    const p = new EmojiParticle(value, size, this.t, this.gu);

    this.particles.push(p);
  }

  addItemIfNew(key, value, size) {
    if (typeof key === 'number') {
      if (key <= this.lastNumericKey) return;
      this.lastNumericKey = key;
    } else {
      if (this.keysHandled.has(key)) return;
      this.keysHandled.set(key, this.t);
    }

    this.addItem(value, size);
  }

  prune() {
    let n = this.particles.length;
    let dcount = 0;
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      if (p.opacity < 0.01) {
        this.particles.splice(i, 1);
        n--;
        dcount++;
      }
    }

    // sanity limit for total number of particles
    const maxN = 50;
    if (this.particles.length > maxN) {
      const n = this.particles.length - maxN;
      this.particles.splice(0, n);
      dcount += n;
    }

    // also prune keysHandled so it doesn't grow infinitely
    for (const [key, value] of this.keysHandled) {
      const age = this.t - value;
      if (age > 3) {
        this.keysHandled.delete(key);
      }
    }
  }
}

export default function EmojiReactions({
  latestReactions,
  xOffset_gu = 0,
  demoMode = false,
}) {
  const t = useVideoTime();
  const pxPerGu = useGrid().pixelsPerGridUnit;
  const emojiSize_gu = 4;

  const sysRef = React.useRef();
  if (!sysRef.current) {
    sysRef.current = new EmojiSystem(t, emojiSize_gu, pxPerGu);

    if (demoMode) sysRef.current.addItem(kDemojis[0]);
  }

  const sys = sysRef.current;
  sys.setTime(t);

  sys.prune();

  if (demoMode && Math.random() > 0.8) {
    sys.addItem(kDemojis[Math.floor(Math.random() * kDemojis.length)]);
  }

  if (Array.isArray(latestReactions) && latestReactions.length > 0) {
    for (const item of latestReactions) {
      const { key, text } = item;
      sys.addItemIfNew(key, text);
    }
  }

  const baseXOffset_px = xOffset_gu * pxPerGu;

  let content = sys.particles.map((p) => {
    const { uuid, value, pos, opacity, size } = p;
    const xOffset = p.xOffset + baseXOffset_px;
    return (
      <Emoji
        key={uuid}
        value={value}
        layout={[placeParticle, { pos, xOffset, size }]}
        blend={{
          opacity,
        }}
      />
    );
  });

  return <Box>{content}</Box>;
}

function placeParticle(parentFrame, params) {
  let { x, y, w, h } = parentFrame;
  const { pos, xOffset, size } = params;

  w = h = size || 60;

  x += parentFrame.w / 2;
  y += parentFrame.h;

  x += xOffset;
  y -= pos;

  return { x, y, w, h };
}
