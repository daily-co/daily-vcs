import * as React from 'react';
import { Box, Emoji, Text, Image } from '#vcs-react/components';
import { useVideoTime } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';
import { DEFAULT_FONT } from '../constants.js';

// our custom component maintains an instance of this class
// to track the incoming toast messages
class ToastQueue {
  constructor(t) {
    this.t = Number.isFinite(t) ? t : -1;
    this.items = [];

    this.maxItems = 10;
    this.defaultDisplayDur = 3;
    this.fadeInDur = 0.6;
    this.fadeOutDur = 0.5;

    this.fadeInT = this.t;

    this.lastItemKey = 0;
  }

  setTime(t) {
    if (t === this.t) return;

    this.t = t;

    // clean up items whose display time is past
    const newItems = [];
    for (const item of this.items) {
      let outT = item.t + item.durationInSeconds;

      if (this.items.length === 1) {
        // if this is the last item, keep it around for the fadeout
        outT += this.fadeOutDur;
      }

      if (outT > this.t) newItems.push(item);
    }
    this.items = newItems;
  }

  addItemIfNew(item) {
    if (!item) return;
    if (this.items.length >= this.maxItems) return;

    if (item.key === undefined) {
      console.error("Toast: item must have 'key'", item);
      return;
    }
    if (item.key <= this.lastItemKey) return;

    this.lastItemKey = item.key;

    // inT is the time when this item will be displayed.
    // if we have items, then it's after the last item; otherwise now.
    const isFirstItem = this.items.length === 0;
    const t = isFirstItem
      ? this.t
      : this.items.at(-1).t + this.items.at(-1).durationInSeconds;

    this.items.push({
      ...item,
      t,
      durationInSeconds: item.durationInSeconds || this.defaultDisplayDur,
    });

    if (isFirstItem) this.fadeInT = t;
  }

  getCurrentItem() {
    if (this.items.length < 1) return null;

    const item = this.items[0];
    let opacity = 1;

    if (this.t - this.fadeInT < this.fadeInDur) {
      // render a fade in
      const tInFade = this.t - this.fadeInT;
      const pos = Math.max(0, tInFade / this.fadeInDur);
      opacity = pos;
    } else {
      const tInItem = this.t - item.t;
      if (tInItem > item.durationInSeconds) {
        // render a fade out
        const tInFade = tInItem - item.durationInSeconds;
        const pos = Math.min(1, tInFade / this.fadeOutDur);
        opacity = 1 - pos;
      }
    }

    return {
      ...item,
      opacity,
    };
  }
}

export default function Toast({
  currentItem,
  style,
  maxWidth_pct,
  iconSize_gu,
}) {
  const t = useVideoTime();

  const queueRef = React.useRef();
  if (!queueRef.current) {
    queueRef.current = new ToastQueue(t);
  }

  const q = queueRef.current;
  q.setTime(t);
  q.addItemIfNew(currentItem);

  let content, item;
  if ((item = q.getCurrentItem())) {
    content = (
      <ToastContent
        text={item.text}
        opacity={item.opacity}
        showIcon={item.showIcon}
        iconOverrideAssetName={item.iconOverrideAssetName}
        iconOverrideEmoji={item.iconOverrideEmoji}
        iconSize_gu={iconSize_gu}
        style={style}
        maxWidth_pct={maxWidth_pct}
      />
    );
  }

  return <Box>{content}</Box>;
}

function ToastContent({
  text = '',
  opacity = 1,
  showIcon = true,
  iconOverrideAssetName,
  iconOverrideEmoji,
  iconSize_gu = 3,
  style = {},
  maxWidth_pct = {},
}) {
  const {
    strokeColor = [0, 0, 30, 0.44],
    fillColor = [15, 50, 110, 0.6],
    fontSize_px = 21,
    textColor = 'white',
    fontFamily = DEFAULT_FONT,
    fontWeight = '500',
  } = style;

  const bgStyle = {
    fillColor,
    strokeColor,
    strokeWidth_px: 2,
    cornerRadius_px: 24,
  };

  const textStyle = {
    textColor,
    fontFamily,
    fontWeight,
    fontSize_px,
    strokeColor,
    strokeWidth_px: 4,
  };

  const layoutParams = {
    fontSize_px,
    showIcon,
    maxWidth_pct,
  };

  // if emoji is set, it will take priority
  const iconEmoji = iconOverrideEmoji?.trim() || '';
  const iconSrc = iconOverrideAssetName?.trim() || '';
  const iconLayout = [layoutFuncs.toastIcon, { size_gu: iconSize_gu }];

  const textPadL = 1 + (showIcon ? iconSize_gu : 0);
  const textPadR = showIcon ? 1.5 : 1;
  const textPadT = showIcon ? 0 : 0.5;
  const textMinH = showIcon ? iconSize_gu : 3.5;

  return (
    <Box
      style={bgStyle}
      clip
      blend={{ opacity }}
      layout={[layoutFuncs.toast, layoutParams]}
    >
      <Box layout={[layoutFuncs.pad, { pad_gu: 1 }]}>
        {showIcon ? (
          iconEmoji?.length > 0 || iconSrc.length < 1 ? (
            <Emoji value={iconEmoji} layout={iconLayout} />
          ) : (
            <Image src={iconSrc} layout={iconLayout} />
          )
        ) : null}
        <Box
          layout={[
            layoutFuncs.pad,
            { pad_gu: { l: textPadL, r: textPadR, t: textPadT } },
          ]}
        >
          <Box layout={[layoutFuncs.centerYIfNeeded, { minH_gu: textMinH }]}>
            <Text id="text" style={textStyle}>
              {text}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
