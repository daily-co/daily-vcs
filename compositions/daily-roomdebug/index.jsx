import * as React from 'react';
import { Box } from '#vcs-react/components';
import { RoomContext } from '#vcs-react/contexts';
import { debug } from '#vcs-stdlib/components';

import { header, body } from './layouts.js';
import { headerTextColor, textSize_gu } from './constants.js';

export const compositionInterface = {
  displayMeta: {
    name: 'Room Debug',
    description: 'Prints out room metadata',
  },
  params: [],
};

export default function RoomDebugComposition() {
  const room = React.useContext(RoomContext);

  const baseProps = {
    headerTextColor,
    textSize_gu,
  };

  return (
    <Box id="main">
      <debug.MediaInputPrintout
        layout={[header]}
        renderEnv={room.renderingEnvironment}
        {...baseProps}
      />
      <debug.RoomPrintout layout={[body]} room={room} {...baseProps} />
    </Box>
  );
}
