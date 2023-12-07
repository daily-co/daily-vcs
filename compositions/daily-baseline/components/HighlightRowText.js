import * as React from 'react';
import { Box, Image, Text } from '#vcs-react/components';
import { useVideoTime, useViewportSize } from '#vcs-react/hooks';
import * as layoutFuncs from '../layouts.js';

export default function HighlightRowText({
  textLines = [],
  highlightIndex = 0,
  textStyle = {},
  highlightStyle = {},
}) {
  const numItems = textLines.length;
  const items = [];

  for (let i = 0; i < textLines.length; i++) {
    const label = textLines[i];
    const isHighlight = i === highlightIndex;
    const itemKey = `${i}_${label}_${isHighlight}`;
    items.push(
      <Box
        key={itemKey}
        layout={[
          layoutFuncs.stackFixedRows,
          { index: i, numItems, offsetY_gu: 1 },
        ]}
      >
        <Text
          id="textitem1"
          style={isHighlight ? highlightStyle : textStyle}
          layout={[
            layoutFuncs.itemText,
            { fontSize_gu: textStyle.fontSize_gu },
          ]}
        >
          {label}
        </Text>
      </Box>
    );
  }

  return <Box>{items}</Box>;
}
