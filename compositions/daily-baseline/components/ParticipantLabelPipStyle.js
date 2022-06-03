import * as React from 'react';
import { Box, Text } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';

export function ParticipantLabelPipStyle({
  label: labelStr,
  labelStyle,
  layout: outerLayout,
  labelsOffset_px,
}) {
  if (
    !labelsOffset_px ||
    !Number.isFinite(labelsOffset_px.x) ||
    !Number.isFinite(labelsOffset_px.y)
  ) {
    labelsOffset_px = { x: 0, y: 0 };
  }
  // apply a default offset for PiP mode so the offset comp param
  // behaves more predictably when the mode param is switched
  const offsets = {
    x: 10 + labelsOffset_px.x,
    y: 10 + labelsOffset_px.y,
  };

  const label = (
    <Text style={labelStyle} layout={[layoutFuncs.offset, offsets]}>
      {labelStr || ''}
    </Text>
  );

  if (outerLayout) {
    // wrap in a box
    return (
      <Box layout={outerLayout} clip>
        {label}
      </Box>
    );
  }
  return label;
}
