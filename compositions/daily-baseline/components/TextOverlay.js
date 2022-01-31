import * as React from 'react';
import { Label } from '#vcs-react/components';
import * as layoutFuncs from '../layouts';
import { DEFAULT_FONT } from '../constants';

export default function TextOverlay({
  content,
  align_vertical,
  align_horizontal,
  offset_x,
  offset_y,
  rotationInDegrees,
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
  if (Number.isFinite(rotationInDegrees)) {
    textTrs = {
      rotate_deg: rotationInDegrees,
    };
  }

  const layoutFn = layoutFuncs.placeText;
  const layoutParams = {
    vAlign: align_vertical,
    hAlign: align_horizontal,
    xOffset: offset_x,
    yOffset: offset_y
  };

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
