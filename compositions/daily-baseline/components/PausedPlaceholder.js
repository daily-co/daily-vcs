import * as React from 'react';
import { Box, Image } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';

export function PausedPlaceholder({ placeholderStyle = {}, layout }) {
  return (
    <Box style={placeholderStyle} layout={layout}>
      <Image src="user_white_64" layout={[layoutFuncs.pausedPlaceholderIcon]} />
    </Box>
  );
}
