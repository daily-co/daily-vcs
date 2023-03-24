import * as React from 'react';
import { Box, Image, Text } from '#vcs-react/components';
import { useVideoTime, useViewportSize } from '#vcs-react/hooks';
import * as layouts from '../layouts.js';

export default function RundownSidebar({
  itemLabels = [],
  highlightIndex = 0,
  textStyle = {},
  highlightStyle = {},
  useTitle,
  title,
  titleStyle = {},
}) {
  const numItems = itemLabels.length + 1;
  const items = [];

  let headItem;
  if (!useTitle) {
    headItem = (
      <Image
        src="header.png"
        layout={[layouts.rundownHeadItem, { pad_gu: 0.3 }]}
      />
    );
  } else {
    headItem = (
      <Text
        style={{ ...titleStyle, textAlign: 'center' }}
        layout={[layouts.rundownHeadItem, { pad_gu: 0.3, offsetY_gu: 1 }]}
      >
        {title}
      </Text>
    );
  }
  items.push(
    <Box key={0} layout={[layouts.stackFixedRows, { index: 0, numItems }]}>
      {headItem}
    </Box>
  );

  for (let i = 0; i < itemLabels.length; i++) {
    const label = itemLabels[i];
    const isHighlight = i === highlightIndex;
    const itemKey = `${i + 1}_${label}_${isHighlight}`;
    items.push(
      <Box
        key={itemKey}
        layout={[
          layouts.stackFixedRows,
          { index: i + 1, numItems, offsetY_gu: 1 },
        ]}
      >
        <Text
          id="textitem1"
          style={isHighlight ? highlightStyle : textStyle}
          layout={[layouts.itemText, { fontSize_gu: textStyle.fontSize_gu }]}
        >
          {label}
        </Text>
      </Box>
    );
  }

  return <Box layout={[layouts.pad, { pad_gu: 0.5 }]}>{items}</Box>;
}
