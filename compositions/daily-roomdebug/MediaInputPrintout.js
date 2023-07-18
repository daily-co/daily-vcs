import * as React from 'react';
import { Box, Text } from '#vcs-react/components';
import { MediaInputContext } from '#vcs-react/contexts';
import { pad } from '#vcs-stdlib/layouts';

import { textSize_gu, headerTextColor } from './constants.js';
import { simpleLineGrid } from './layouts.js';

export function MediaInputPrintout({ layout: baseLayout, renderEnv }) {
  const mediaInput = React.useContext(MediaInputContext);

  const printout = React.useMemo(() => {
    const { viewportSize, pixelsPerGridUnit, activeVideoInputSlots } =
      mediaInput;

    let info = `Video inputs         [viewport = ${viewportSize.w}*${viewportSize.h}, px/gu = ${pixelsPerGridUnit}`;
    if (renderEnv?.length > 0) info += `, renderEnv = "${renderEnv}"`;
    info += ']';

    const total = activeVideoInputSlots.length;
    const items = [];
    for (let i = 0; i < total; i++) {
      const slot = activeVideoInputSlots[i];
      if (slot) {
        let id = '',
          type = '',
          paused = false,
          dominant = false;
        if (typeof slot === 'object') {
          ({ id, type, paused, dominant } = slot);
        }

        let style = { fontSize_gu: textSize_gu * 0.93 };
        const isScreenshare = type === 'screenshare';
        if (isScreenshare) {
          style = { ...style, textColor: 'lightblue' };
        }
        if (paused) {
          style = {
            ...style,
            fontStyle: 'italic',
            textColor: isScreenshare ? 'rgb(160, 120, 255)' : 'pink',
          };
        }
        if (dominant) {
          style = { ...style, fontWeight: '700' };
        }

        let itemLine = `${i + 1}: ${id} (${type})`;
        if (dominant) {
          itemLine = 'D ' + itemLine;
        }

        items.push(
          <Text
            key={i}
            style={style}
            layout={[simpleLineGrid, { total, index: i, numCols: 4 }]}
          >
            {itemLine}
          </Text>
        );
      }
    }

    return (
      <Box>
        <Text
          style={{
            fontSize_gu: textSize_gu,
            textColor: headerTextColor,
          }}
        >
          {info}
        </Text>
        <Box layout={[pad, { pad_gu: { t: 2 } }]}>{items}</Box>
      </Box>
    );
  }, [mediaInput]);

  const bgStyle = {
    fillColor: 'rgb(100, 0, 0)',
  };

  return (
    <Box id="mediaInput" style={bgStyle} layout={baseLayout}>
      <Box layout={[pad, { pad_gu: { t: 1, l: 1 } }]}>{printout}</Box>
    </Box>
  );
}
