import * as React from 'react';
import { Box, Text, Video, Image } from '#vcs-react/components';
import { useActiveVideo, useParams } from '#vcs-react/hooks';
import { pad } from '#vcs-stdlib/layouts';

export const compositionInterface = {
  displayMeta: {
    name: 'Stretch Box',
    description: 'Renders an adaptive text container',
  },
  params: [
    {
      id: 'textContent',
      type: 'text',
      defaultValue: 'Hello world. Lorem ipsum dolor sit amet.',
    },
    {
      id: 'maxBoxWidth_gu',
      type: 'number',
      defaultValue: 24,
    },
    {
      id: 'iconSize_gu',
      type: 'number',
      defaultValue: 5,
    },
  ],
};

export default function StretchBoxComposition() {
  const { activeIds } = useActiveVideo();
  const params = useParams();

  let video;
  if (activeIds.length > 0) {
    video = <Video src={activeIds[0]} />;
  }

  const {
    textContent: content,
    maxBoxWidth_gu: maxWidth_gu,
    iconSize_gu,
  } = params;

  return (
    <Box id="main">
      <Box>{video}</Box>
      <AdaptiveTextAndIcon {...{ content, maxWidth_gu, iconSize_gu }} />
    </Box>
  );
}

function AdaptiveTextAndIcon({ content, maxWidth_gu, iconSize_gu }) {
  const bgStyle = {
    fillColor: 'rgba(50, 60, 160, 0.9',
  };
  const textStyle = {
    fontSize_gu: 1.5,
    textColor: 'white',
  };

  return (
    <Box
      id="stretchBox"
      style={bgStyle}
      layout={[layoutFuncs.demoBox, { maxWidth_gu }]}
    >
      <Box id="padAround" layout={[pad, { pad_gu: 2 }]}>
        <Image
          src="test_square"
          layout={[layoutFuncs.demoIcon, { size_gu: iconSize_gu }]}
        />
        <Box
          id="padLeftForIcon"
          layout={[pad, { pad_gu: { l: iconSize_gu + 2 } }]}
        >
          <Text id="text" style={textStyle}>
            {content}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

const layoutFuncs = {
  demoBox: (parentFrame, params, layoutCtx) => {
    const pxPerGu = layoutCtx.pixelsPerGridUnit;
    const { maxWidth_gu = 24 } = params;
    const viewportH = layoutCtx.viewport.h;
    let { x, y, w, h } = parentFrame;

    const marginY = 4 * pxPerGu;
    const defaultW = maxWidth_gu * pxPerGu;
    const defaultH = viewportH - parentFrame.y - marginY;

    const contentSize = layoutCtx.useContentSize();

    w = contentSize.w > 0 ? contentSize.w : defaultW;
    h = contentSize.h > 0 ? contentSize.h : defaultH;

    y += parentFrame.h - h - marginY;

    return { x, y, w, h };
  },
  demoIcon: (parentFrame, params, layoutCtx) => {
    const pxPerGu = layoutCtx.pixelsPerGridUnit;
    const { size_gu = 5 } = params;
    let { x, y, w, h } = parentFrame;

    const dim = size_gu * pxPerGu;
    w = dim;
    h = dim;

    return { x, y, w, h };
  },
};
