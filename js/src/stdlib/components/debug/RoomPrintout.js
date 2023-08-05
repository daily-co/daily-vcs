import * as React from 'react';
import { Box, Text } from '#vcs-react/components';
import { pad, simpleLineGrid } from '#vcs-stdlib/layouts';

export function RoomPrintout({
  layout: baseLayout,
  room,
  textSize_gu = 1,
  headerTextColor = 'rgba(255, 255, 255, 0.68)',
  bgOpacity = 1,
}) {
  const printout = React.useMemo(() => {
    const { availablePeers: peers } = room;

    const total = peers.length;
    const items = [];

    for (let i = 0; i < total; i++) {
      const peer = peers[i];
      const { id, displayName, video, audio, screenshareVideo } = peer;

      let style = { fontSize_gu: textSize_gu * 0.93 };

      let lines = [];

      lines.push(`id = ${id}`);
      lines.push(`"${displayName}"`);

      if (video?.id != null) {
        const { id, paused } = video;
        let line = `video ${id}`;
        if (paused) line += ' (paused)';
        lines.push(line);
      }
      if (screenshareVideo?.id != null) {
        const { id, paused } = screenshareVideo;
        let line = `sshare ${id}`;
        if (paused) line += ' (paused)';
        lines.push(line);
      }
      if (audio?.id != null) {
        const { id, paused } = audio;
        let line = `audio ${id}`;
        if (paused) line += ' (paused)';
        lines.push(line);
      }

      items.push(
        React.createElement(
          Text,
          {
            key: i,
            style,
            layout: [
              simpleLineGrid,
              { total, index: i, numCols: 3, numTextLines: 5, textSize_gu },
            ],
          },
          lines.join('\n')
        )
      );
    }

    return React.createElement(
      Box,
      {},
      React.createElement(
        Text,
        { style: { fontSize_gu: textSize_gu, textColor: headerTextColor } },
        'Room peers'
      ),
      React.createElement(Box, { layout: [pad, { pad_gu: { t: 2 } }] }, items)
    );
  }, [room]);

  const bgStyle = {
    fillColor: `rgba(20, 10, 80, ${bgOpacity})`,
  };

  return React.createElement(
    Box,
    {
      id: 'room',
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
