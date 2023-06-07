import * as React from 'react';
import { Box, Text } from '#vcs-react/components';
import * as layouts from '../layouts.js';

export default function ParticipantLabel({ name, style, layout }) {
  return (
    <Box layout={layout}>
      <Text style={style} layout={[layouts.positionParticipantLabel]}>
        {name}
      </Text>
    </Box>
  );
}
