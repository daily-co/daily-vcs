import * as React from 'react';
import { Box, Text } from '#vcs-react/components';
import { MediaInputContext } from '#vcs-react/contexts';
import { pad, simpleLineGrid } from '#vcs-stdlib/layouts';

export function MediaInputPrintout({
  layout: baseLayout,
  renderEnv,
  textSize_gu = 1,
  headerTextColor = 'rgba(255, 255, 255, 0.68)',
  bgOpacity = 1,
}) {
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
          React.createElement(
            Text,
            {
              key: i,
              style,
              layout: [
                simpleLineGrid,
                { total, index: i, numCols: 4, textSize_gu },
              ],
            },
            itemLine
          )
        );
      }
    }

    return React.createElement(
      Box,
      {},
      React.createElement(
        Text,
        {
          style: {
            fontSize_gu: textSize_gu,
            textColor: headerTextColor,
          },
        },
        info
      ),
      React.createElement(Box, { layout: [pad, { pad_gu: { t: 2 } }] }, items)
    );
  }, [mediaInput]);

  const bgStyle = {
    fillColor: `rgba(100, 0, 0, ${bgOpacity})`,
  };

  return React.createElement(
    Box,
    {
      id: 'mediaInput',
      style: bgStyle,
      layout: baseLayout,
    },
    React.createElement(
      Box,
      {
        layout: [pad, { pad_gu: { t: 1, l: 1 } }],
      },
      printout
    )
  );
}
