import * as React from 'react';
import { Label } from '#vcs-react/components';
import * as layoutFuncs from '../layouts';
import { DEFAULT_FONT } from '../constants';

export default function TextOverlay({
  content,
  vAlign,
  hAlign,
  xOffset,
  yOffset,
  rotation,
  color,
  fontSize_vh,
  fontWeight,
  strokeColor,
  useStroke
}) {
  const textStyle = {
    textColor: color || 'rgba(255, 250, 200, 0.95)',
    fontFamily: DEFAULT_FONT,
    fontWeight: fontWeight || '500',
    fontSize_vh: fontSize_vh || 0.07,
    strokeColor,
    strokeWidth_px: useStroke ? 12 : 0,
  };
  let textTrs;
  if (rotation) {
    textTrs = {
      rotate_deg: rotation,
    };
  }

  const layoutFn = layoutFuncs.placeText;
  const layoutParams = { vAlign, hAlign, xOffset, yOffset };

  return (
    <Label
      style={textStyle}
      transform={textTrs}
      layout={[layoutFn, layoutParams]}
    >
      {content || ''}
    </Label>
  );
}
