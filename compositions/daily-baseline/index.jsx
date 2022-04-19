import * as React from 'react';
import { Box } from '#vcs-react/components';
import { useParams } from '#vcs-react/hooks';
import * as layoutFuncs from './layouts.js';

import {
  DEFAULT_FONT,
  DEFAULT_LABEL_FONT_SIZE_PX,
  DEFAULT_TOAST_FONT_SIZE_PX,
  DEFAULT_CORNER_RADIUS_PX,
  PositionEdge,
  PositionCorner,
} from './constants.js';

import CustomOverlay from './components/CustomOverlay.js';
import ImageOverlay from './components/ImageOverlay.js';
import Toast from './components/Toast.js';
import TextOverlay from './components/TextOverlay.js';
import VideoDominant from './components/VideoDominant.js';
import VideoGrid from './components/VideoGrid.js';
import VideoPip from './components/VideoPip.js';
import VideoSingle from './components/VideoSingle.js';
import VideoSplit from './components/VideoSplit.js';

// request all standard fonts
const fontFamilies = [
  'Roboto',
  'RobotoCondensed',
  'Anton',
  'Bangers',
  'Bitter',
  'Exo',
  'Magra',
  'PermanentMarker',
  'SuezOne',
  'Teko',
];
// fonts that are legible at a small size (for participant labels)
const fontFamilies_smallSizeFriendly = [
  'Roboto',
  'RobotoCondensed',
  'Bitter',
  'Exo',
  'Magra',
  'SuezOne',
  'Teko',
];
// not all fonts have every weight,
// but we can't currently filter the UI based on the font name
const fontWeights = [
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
];

// -- the control interface exposed by this composition --
export const compositionInterface = {
  displayMeta: {
    name: 'Daily Baseline',
    description: "Composition with Daily's baseline features",
  },
  fontFamilies,
  imagePreloads: ['user_white_64.png', 'overlay.png', 'party-popper_1f389.png'],
  params: [
    // -- composition's video layout mode --
    {
      id: 'mode',
      type: 'enum',
      defaultValue: 'grid',
      values: ['single', 'split', 'grid', 'dominant', 'pip'],
    },
    {
      id: 'showTextOverlay',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'showImageOverlay',
      type: 'boolean',
      defaultValue: false,
    },
    // -- video layout params --
    {
      id: 'videoSettings.showParticipantLabels',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'videoSettings.roundedCorners',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'videoSettings.scaleMode',
      type: 'enum',
      defaultValue: 'fill',
      values: ['fill', 'fit'],
    },
    {
      id: 'videoSettings.placeholder.bgColor',
      type: 'text',
      defaultValue: 'rgb(0, 50, 80)',
    },
    {
      id: 'videoSettings.dominant.position',
      type: 'enum',
      defaultValue: PositionEdge.LEFT,
      values: Object.values(PositionEdge),
    },
    {
      id: 'videoSettings.dominant.splitPos',
      type: 'number',
      defaultValue: 0.8,
      step: 0.1,
    },
    {
      id: 'videoSettings.dominant.numChiclets',
      type: 'number',
      defaultValue: 5,
    },
    {
      id: 'videoSettings.dominant.followDomFlag',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'videoSettings.pip.position',
      type: 'enum',
      defaultValue: PositionCorner.TOP_RIGHT,
      values: Object.values(PositionCorner),
    },
    {
      id: 'videoSettings.pip.aspectRatio',
      type: 'number',
      defaultValue: 1,
      step: 0.1,
    },
    {
      id: 'videoSettings.pip.height_vh',
      type: 'number',
      defaultValue: 0.3,
      step: 0.1,
    },
    {
      id: 'videoSettings.pip.margin_vh',
      type: 'number',
      defaultValue: 0.04,
      step: 0.01,
    },
    {
      id: 'videoSettings.pip.followDomFlag',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'videoSettings.labels.fontFamily',
      type: 'enum',
      defaultValue: fontFamilies_smallSizeFriendly[0],
      values: fontFamilies_smallSizeFriendly,
    },
    {
      id: 'videoSettings.labels.fontWeight',
      type: 'enum',
      defaultValue: '600',
      values: fontWeights,
    },
    {
      id: 'videoSettings.labels.fontSize_pct',
      type: 'number',
      defaultValue: 100,
    },
    {
      id: 'videoSettings.labels.offset_x',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'videoSettings.labels.offset_y',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'videoSettings.labels.color',
      type: 'text',
      defaultValue: 'white',
    },
    {
      id: 'videoSettings.labels.strokeColor',
      type: 'text',
      defaultValue: 'rgba(0, 0, 0, 0.9)',
    },
    {
      id: 'videoSettings.margin.left_vw',
      type: 'number',
      defaultValue: 0,
      step: 0.01,
    },
    {
      id: 'videoSettings.margin.right_vw',
      type: 'number',
      defaultValue: 0,
      step: 0.01,
    },
    {
      id: 'videoSettings.margin.top_vh',
      type: 'number',
      defaultValue: 0,
      step: 0.01,
    },
    {
      id: 'videoSettings.margin.bottom_vh',
      type: 'number',
      defaultValue: 0,
      step: 0.01,
    },

    // -- text overlay params --
    {
      id: 'text.content',
      type: 'text',
      defaultValue: 'An example text overlay',
      //'An example text overlay\nwith line breaks\nThis third line is very long dolor sit amet lorem ipsum, and the line ends here.',
    },
    {
      id: 'text.align_horizontal',
      type: 'enum',
      defaultValue: 'center',
      values: ['left', 'right', 'center'],
    },
    {
      id: 'text.align_vertical',
      type: 'enum',
      defaultValue: 'center',
      values: ['top', 'bottom', 'center'],
    },
    {
      id: 'text.offset_x',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'text.offset_y',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'text.rotationInDegrees',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'text.fontFamily',
      type: 'enum',
      defaultValue: fontFamilies[0],
      values: fontFamilies,
    },
    {
      id: 'text.fontWeight',
      type: 'enum',
      defaultValue: '400',
      values: fontWeights,
    },
    {
      id: 'text.fontStyle',
      type: 'enum',
      defaultValue: '',
      values: ['normal', 'italic'],
    },
    {
      id: 'text.fontSize_percentageOfViewH',
      type: 'number',
      defaultValue: 7,
    },
    {
      id: 'text.color',
      type: 'text',
      defaultValue: 'rgba(255, 250, 200, 0.95)',
    },
    {
      id: 'text.strokeColor',
      type: 'text',
      defaultValue: 'rgba(0, 0, 0, 0.8)',
    },

    // -- image overlay params --
    {
      id: 'image.assetName',
      type: 'text',
      defaultValue: 'overlay.png',
    },
    {
      id: 'image.position',
      type: 'enum',
      defaultValue: PositionCorner.TOP_RIGHT,
      values: Object.values(PositionCorner),
    },
    {
      id: 'image.fullScreen',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'image.aspectRatio',
      type: 'number',
      defaultValue: 1.778,
      step: 0.1,
    },
    {
      id: 'image.height_vh',
      type: 'number',
      defaultValue: 0.3,
      step: 0.1,
    },
    {
      id: 'image.margin_vh',
      type: 'number',
      defaultValue: 0.04,
      step: 0.01,
    },
    {
      id: 'image.opacity',
      type: 'number',
      defaultValue: 1,
      step: 0.1,
    },

    // -- toast params --
    {
      id: 'toast.key',
      type: 'number',
      defaultValue: 0,
      shortHelpText: "To send a toast, increment the value of 'key'",
    },
    {
      id: 'toast.text',
      type: 'text',
      defaultValue: 'Hello world',
    },
    {
      id: 'toast.duration_secs',
      type: 'number',
      defaultValue: 4,
    },
    {
      id: 'toast.numTextLines',
      type: 'number',
      defaultValue: 2,
    },
    {
      id: 'toast.showIcon',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'toast.icon.assetName',
      type: 'text',
      defaultValue: '',
    },
    {
      id: 'toast.color',
      type: 'text',
      defaultValue: 'rgba(15, 50, 110, 0.6)',
    },
    {
      id: 'toast.strokeColor',
      type: 'text',
      defaultValue: 'rgba(0, 0, 30, 0.44)',
    },
    {
      id: 'toast.text.color',
      type: 'text',
      defaultValue: 'white',
    },
    {
      id: 'toast.text.fontFamily',
      type: 'enum',
      defaultValue: fontFamilies_smallSizeFriendly[0],
      values: fontFamilies_smallSizeFriendly,
    },
    {
      id: 'toast.text.fontWeight',
      type: 'enum',
      defaultValue: '500',
      values: fontWeights,
    },
    {
      id: 'toast.text.fontSize_pct',
      type: 'number',
      defaultValue: 100,
    },
  ],
};

// -- the root component of this composition --
export default function DailyBaselineVCS() {
  const params = useParams();

  // style applied to video elements.
  // placeholder is used if no video is available.
  const videoStyle = {
    cornerRadius_px: params['videoSettings.roundedCorners']
      ? DEFAULT_CORNER_RADIUS_PX
      : 0,
  };
  const placeholderStyle = {
    fillColor: params['videoSettings.placeholder.bgColor'] || '#008',
    cornerRadius_px: videoStyle.cornerRadius_px,
  };
  const videoLabelStyle = {
    textColor: params['videoSettings.labels.color'] || 'white',
    fontFamily: params['videoSettings.labels.fontFamily'] || DEFAULT_FONT,
    fontWeight: params['videoSettings.labels.fontWeight'] || '600',
    fontSize_px: params['videoSettings.labels.fontSize_pct']
      ? (params['videoSettings.labels.fontSize_pct'] / 100) *
        DEFAULT_LABEL_FONT_SIZE_PX
      : DEFAULT_LABEL_FONT_SIZE_PX,
    strokeColor:
      params['videoSettings.labels.strokeColor'] || 'rgba(0, 0, 0, 0.9)',
    strokeWidth_px: 4,
  };

  // props passed to the video layout component
  const videoProps = {
    videoStyle,
    placeholderStyle,
    videoLabelStyle,
    showLabels: params['videoSettings.showParticipantLabels'],
    scaleMode: params['videoSettings.scaleMode'],
    labelsOffset_px: {
      x: params['videoSettings.labels.offset_x']
        ? parseInt(params['videoSettings.labels.offset_x'], 10)
        : 0,
      y: params['videoSettings.labels.offset_y']
        ? parseInt(params['videoSettings.labels.offset_y'], 10)
        : 0,
    },
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
    case 'pip':
      video = (
        <VideoPip
          {...videoProps}
          positionCorner={params['videoSettings.pip.position']}
          aspectRatio={params['videoSettings.pip.aspectRatio']}
          height_vh={params['videoSettings.pip.height_vh']}
          margin_vh={params['videoSettings.pip.margin_vh']}
          followDominantFlag={params['videoSettings.pip.followDomFlag']}
        />
      );
      break;
    case 'dominant':
      video = (
        <VideoDominant
          {...videoProps}
          positionEdge={params['videoSettings.dominant.position']}
          splitPos={params['videoSettings.dominant.splitPos']}
          maxItems={params['videoSettings.dominant.numChiclets']}
          followDominantFlag={params['videoSettings.dominant.followDomFlag']}
        />
      );
      break;
  }

  let graphics = [];
  let gi = 0;
  if (params.showTextOverlay) {
    // copy params to props and ensure types are what the component expects
    let overlayProps = params.text ? { ...params.text } : {};
    overlayProps.offset_x = parseInt(overlayProps.offset_x, 10);
    overlayProps.offset_y = parseInt(overlayProps.offset_y, 10);
    overlayProps.rotationInDegrees = parseFloat(overlayProps.rotationInDegrees);

    const fontSize_vh_pct = parseFloat(overlayProps.fontSize_percentageOfViewH);
    overlayProps.fontSize_vh =
      fontSize_vh_pct > 0 ? fontSize_vh_pct / 100 : null;

    overlayProps.color = overlayProps.color ? overlayProps.color.trim() : null;

    overlayProps.strokeColor = overlayProps.strokeColor
      ? overlayProps.strokeColor.trim()
      : null;
    overlayProps.useStroke =
      overlayProps.strokeColor && overlayProps.strokeColor.length > 0;

    graphics.push(<TextOverlay key={gi} {...overlayProps} />);
  }
  gi++;

  if (params.showImageOverlay) {
    graphics.push(
      <ImageOverlay
        key={gi}
        src={params['image.assetName']}
        positionCorner={params['image.position']}
        fullScreen={params['image.fullScreen']}
        aspectRatio={params['image.aspectRatio']}
        height_vh={params['image.height_vh']}
        margin_vh={params['image.margin_vh']}
        opacity={params['image.opacity']}
      />
    );
  }
  gi++;

  graphics.push(
    <Toast
      key={gi++}
      numberOfLines={
        params['toast.numTextLines']
          ? parseInt(params['toast.numTextLines'], 10)
          : 2
      }
      currentItem={{
        key: params['toast.key'] ? parseInt(params['toast.key'], 10) : 0,
        text: params['toast.text'],
        showIcon: !!params['toast.showIcon'],
        iconOverrideAssetName: params['toast.icon.assetName'],
        durationInSeconds: params['toast.duration_secs']
          ? parseFloat(params['toast.duration_secs'])
          : 4,
      }}
      style={{
        fillColor: params['toast.color'],
        textColor: params['toast.text.color'] || 'white',
        fontFamily: params['toast.text.fontFamily'] || DEFAULT_FONT,
        fontWeight: params['toast.text.fontWeight'] || '500',
        fontSize_px: params['toast.text.fontSize_pct']
          ? (params['toast.text.fontSize_pct'] / 100) *
            DEFAULT_TOAST_FONT_SIZE_PX
          : DEFAULT_TOAST_FONT_SIZE_PX,
        strokeColor: params['toast.strokeColor'],
      }}
    />
  );

  graphics.push(<CustomOverlay key={gi++} />);

  // apply a layout function to the video container if non-zero margins specified
  let videoBoxLayout;
  const videoMargins_rel = {
    l: parseFloat(params['videoSettings.margin.left_vw']),
    r: parseFloat(params['videoSettings.margin.right_vw']),
    t: parseFloat(params['videoSettings.margin.top_vh']),
    b: parseFloat(params['videoSettings.margin.bottom_vh']),
  };
  if (
    videoMargins_rel.l !== 0 ||
    videoMargins_rel.r !== 0 ||
    videoMargins_rel.t !== 0 ||
    videoMargins_rel.b !== 0
  ) {
    videoBoxLayout = [
      layoutFuncs.pad,
      { pad_viewportRelative: videoMargins_rel },
    ];
  }

  return (
    <Box id="main">
      <Box id="videoBox" layout={videoBoxLayout}>
        {video}
      </Box>
      <Box id="graphicsBox">{graphics}</Box>
    </Box>
  );
}
