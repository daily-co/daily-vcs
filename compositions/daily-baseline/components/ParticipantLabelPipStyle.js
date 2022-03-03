import * as React from 'react';
import { Box, Label } from '#vcs-react/components';
import * as layoutFuncs from '../layouts';

export function ParticipantLabelPipStyle({
  label: labelStr,
  labelStyle,
  layout: outerLayout,
}) {
  const label = (
    <Label
      style={labelStyle}
      layout={[layoutFuncs.offset, { x: 10, y: 10 }]}
    >
      {labelStr || ''}
    </Label>
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
