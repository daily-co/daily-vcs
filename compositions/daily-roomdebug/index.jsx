import * as React from 'react';
import { Box } from '#vcs-react/components';
import { RoomContext } from '#vcs-react/contexts';

import { MediaInputPrintout } from './MediaInputPrintout.js';
import { RoomPrintout } from './RoomPrintout.js';
import { header, body } from './layouts.js';

export const compositionInterface = {
  displayMeta: {
    name: 'Room Debug',
    description: 'Prints out room metadata',
  },
  params: [],
};

export default function RoomDebugComposition() {
  const room = React.useContext(RoomContext);

  return (
    <Box id="main">
      <MediaInputPrintout
        layout={[header]}
        renderEnv={room.renderingEnvironment}
      />
      <RoomPrintout layout={[body]} room={room} />
    </Box>
  );
}
