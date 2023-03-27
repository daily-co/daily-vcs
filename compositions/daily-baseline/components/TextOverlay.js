import * as React from 'react';
import { Text } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';
import { DEFAULT_FONT } from '../constants.js';

export default function TextOverlay({
  content,
  align_vertical,
  align_horizontal,
  offset_x_gu,
  offset_y_gu,
  scale_x,
  rotation_deg,
  color,
  fontFamily,
  fontSize_gu,
  fontWeight,
  fontStyle,
  strokeColor,
  useStroke,
}) {
  const textStyle = {
    textColor: color || 'rgba(255, 250, 200, 0.95)',
    fontFamily: fontFamily || DEFAULT_FONT,
    fontWeight: fontWeight || '500',
    fontStyle: fontStyle || '',
    fontSize_gu: fontSize_gu || 2.5,
    strokeColor,
    strokeWidth_px: useStroke ? 12 : 0,
    textAlign: align_horizontal,
  };
  let textTrs;
  if (Number.isFinite(rotation_deg)) {
    if (!textTrs) textTrs = {};
    textTrs.rotate_deg = rotation_deg;
  }
  if (Number.isFinite(scale_x)) {
    if (!textTrs) textTrs = {};
    textTrs.scaleX = scale_x;
  }

  const layoutFn = layoutFuncs.placeText;
  const layoutParams = {
    vAlign: align_vertical,
    hAlign: align_horizontal,
    xOffset_gu: offset_x_gu,
    yOffset_gu: offset_y_gu,
  };

  return (
    <Text
      style={textStyle}
      transform={textTrs}
      layout={[layoutFn, layoutParams]}
    >
      {content || ''}
    </Text>
  );
}
