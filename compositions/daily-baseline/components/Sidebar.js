import * as React from 'react';
import { Box, Image, Text } from '#vcs-react/components';
import { useVideoTime } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';

export default function Sidebar({
  messages,
  highlightRows,
  isHorizontal = true,
  size_gu = 16,
  padding_gu = 1,
  bgStyle,
  textStyle,
  highlightTextStyle,
}) {
  let items;
  if (messages) {
    // show chat messages
    const maxN = 8;
    if (messages.length > maxN) {
      messages = messages.slice(messages.length - maxN, maxN);
    }

    items = messages.map((msg) => {
      const { key, text, senderDisplayName = '' } = msg;
      return (
        <Text key={key} style={textStyle}>
          {senderDisplayName.length > 0 ? `${senderDisplayName}: ` : ''}
          {text || ''}
        </Text>
      );
    });
  } else if (highlightRows) {
    const { highlightIndex, textRows } = highlightRows;
    items = textRows.map((text, idx) => {
      return (
        <Text
          key={idx}
          style={idx === highlightIndex ? highlightTextStyle : textStyle}
        >
          {text || ''}
        </Text>
      );
    });
  }

  return (
    <Box
      id="sidebar"
      layout={[layoutFuncs.sidebar, { isHorizontal, size_gu }]}
      style={bgStyle}
      clip
    >
      <Box id="sidebarPad" layout={[layoutFuncs.pad, { pad_gu: padding_gu }]}>
        <Box id="sidebarTextScroll" layout={[layoutFuncs.sidebarPlaceText]}>
          <Box id="sidebarStack" layout={[layoutFuncs.textStack]}>
            {items}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
