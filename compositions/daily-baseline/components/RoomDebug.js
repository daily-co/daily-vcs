import * as React from 'react';
import { Box } from '#vcs-react/components';
import { RoomContext } from '#vcs-react/contexts';
import { debug } from '#vcs-stdlib/components';

const textSize_gu = 1;
const headerTextColor = 'rgba(255, 255, 255, 0.68)';
const headerH_gu = textSize_gu * 10;

export default function RoomDebug({ bgOpacity = 1 }) {
  const room = React.useContext(RoomContext);

  const baseProps = {
    headerTextColor,
    textSize_gu,
    bgOpacity,
  };

  return (
    <Box id="roomDebug">
      <debug.MediaInputPrintout
        layout={[header]}
        renderEnv={room.renderingEnvironment}
        {...baseProps}
      />
      <debug.RoomPrintout layout={[body]} room={room} {...baseProps} />
    </Box>
  );
}

function header(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const pxPerGu = layoutCtx.pixelsPerGridUnit;

  h = headerH_gu * pxPerGu;

  return { x, y, w, h };
}

function body(parentFrame, params, layoutCtx) {
  let { x, y, w, h } = parentFrame;
  const pxPerGu = layoutCtx.pixelsPerGridUnit;

  const headerH_px = headerH_gu * pxPerGu;
  y += headerH_px;
  h -= headerH_px;

  return { x, y, w, h };
}
