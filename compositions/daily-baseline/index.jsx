import * as React from 'react';
import { Box } from '#vcs-react/components';
import { useParams } from '#vcs-react/hooks';

import {
  DEFAULT_FONT,
  DEFAULT_LABEL_FONT_SIZE_PX,
  DEFAULT_CORNER_RADIUS_PX,
} from './constants';

import CustomOverlay from './components/CustomOverlay';
import TextOverlay from './components/TextOverlay';
import VideoDominant from './components/VideoDominant';
import VideoGrid from './components/VideoGrid';
import VideoSingle from './components/VideoSingle';
import VideoSplit from './components/VideoSplit';

// -- the control interface exposed by this composition --
export const compositionInterface = {
  displayMeta: {
    name: 'Daily Baseline',
    description: "Composition with Daily's baseline features",
  },
  params: [
    // -- composition's video layout mode --
    {
      id: 'mode',
      type: 'enum',
      defaultValue: 'grid',
      values: ['single', 'split', 'grid', 'dominant'],
    },
    // -- video grid params --
    {
      id: 'showParticipantLabels',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'roundedCorners',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'dominantOnLeft',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'videoScaleMode',
      type: 'enum',
      defaultValue: 'fill',
      values: ['fill', 'fit'],
    },
    // -- text overlay params --
    {
      id: 'showTextOverlay',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'textContent',
      type: 'text',
      defaultValue: 'An example text overlay',
    },
    {
      id: 'textAlign_horizontal',
      type: 'enum',
      defaultValue: 'center',
      values: ['left', 'right', 'center'],
    },
    {
      id: 'textAlign_vertical',
      type: 'enum',
      defaultValue: 'center',
      values: ['top', 'bottom', 'center'],
    },
    {
      id: 'textOffset_x',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'textOffset_y',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'textRotationInDegrees',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'textFontWeight',
      type: 'text',
      defaultValue: '500',
    },
    {
      id: 'textFontSize_percentageOfViewH',
      type: 'number',
      defaultValue: 7,
    },
    {
      id: 'textColor',
      type: 'text',
      defaultValue: 'rgba(255, 250, 200, 0.95)',
    },
    {
      id: 'textStrokeColor',
      type: 'text',
      defaultValue: 'rgba(0, 0, 0, 0.8)',
    },
  ],
};

// -- the root component of this composition --
export default function DailyBaselineVCS() {
  const params = useParams();

  // style applied to video elements.
  // placeholder is used if no video is available.
  const videoStyle = {
    cornerRadius_px: params.roundedCorners ? DEFAULT_CORNER_RADIUS_PX : 0,
  };
  const placeholderStyle = {
    fillColor: '#008',
  };
  const videoLabelStyle = {
    textColor: 'white',
    fontFamily: DEFAULT_FONT,
    fontWeight: '600',
    fontSize_px: DEFAULT_LABEL_FONT_SIZE_PX,
    strokeColor: 'rgba(0, 0, 0, 0.9)',
    strokeWidth_px: 4,
  };

  // props passed to the video layout component
  const videoProps = {
    videoStyle,
    placeholderStyle,
    videoLabelStyle,
    showLabels: params.showParticipantLabels,
    scaleMode: params.videoScaleMode,
  };
  let video;
  switch (params.mode) {
    default:
    case 'single':
      video = <VideoSingle {...videoProps} />;
      break;
    case 'grid':
      video = <VideoGrid {...videoProps} />;
      break;
    case 'split':
      video = <VideoSplit {...videoProps} />;
      break;
    case 'dominant':
      video = (
        <VideoDominant {...videoProps} dominantOnLeft={params.dominantOnLeft} />
      );
      break;
  }

  let graphics = [];
  if (params.showTextOverlay) {
    const fontSize_vh_pct = parseFloat(params.textFontSize_percentageOfViewH);
    const strokeColor = params.textStrokeColor
      ? params.textStrokeColor.trim()
      : null;
    const useStroke = strokeColor && strokeColor.length > 0;

    const overlayProps = {
      content: params.textContent,
      hAlign: params.textAlign_horizontal,
      vAlign: params.textAlign_vertical,
      xOffset: parseInt(params.textOffset_x, 10),
      yOffset: parseInt(params.textOffset_y, 10),
      rotation: parseFloat(params.textRotationInDegrees),
      fontWeight: params.textFontWeight,
      fontSize_vh: fontSize_vh_pct > 0 ? fontSize_vh_pct / 100 : null,
      color: params.textColor,
      strokeColor,
      useStroke,
    };
    graphics.push(<TextOverlay key={0} {...overlayProps} />);
  }
  graphics.push(<CustomOverlay key={1} />);

  return (
    <Box id="main">
      <Box id="videoBox">{video}</Box>
      <Box id="graphicsBox">{graphics}</Box>
    </Box>
  );
}
