import {
  PositionEdge,
  PositionCorner,
  fontFamilies,
  fontFamilies_smallSizeFriendly,
  fontWeights,
} from './constants.js';

export const compositionParams = [
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
  {
    id: 'showTitleSlate',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'enableAutoOpeningSlate',
    type: 'boolean',
    defaultValue: false,
    shortHelpText:
      'Shown immediately when stream starts. Goes away automatically.\nTo preview this slate, click Stop, then Restart.',
  },
  // -- video layout params --
  {
    id: 'videoSettings.preferScreenshare',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'videoSettings.omitPaused',
    type: 'boolean',
    defaultValue: false,
  },
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
    id: 'videoSettings.grid.useDominantForSharing',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'videoSettings.grid.itemInterval_gu',
    type: 'number',
    defaultValue: -1,
    step: 0.1,
  },
  {
    id: 'videoSettings.grid.outerPadding_gu',
    type: 'number',
    defaultValue: -1,
    step: 0.1,
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
    id: 'videoSettings.dominant.itemInterval_gu',
    type: 'number',
    defaultValue: 0.7,
    step: 0.1,
  },
  {
    id: 'videoSettings.dominant.outerPadding_gu',
    type: 'number',
    defaultValue: 0.5,
    step: 0.1,
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
    id: 'videoSettings.pip.height_gu',
    type: 'number',
    defaultValue: 12,
    step: 1,
  },
  {
    id: 'videoSettings.pip.margin_gu',
    type: 'number',
    defaultValue: 1.5,
    step: 0.1,
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
    id: 'videoSettings.labels.offset_x_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.1,
  },
  {
    id: 'videoSettings.labels.offset_y_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.1,
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
    id: 'videoSettings.margin.left_gu',
    type: 'number',
    defaultValue: 0,
    step: 1,
  },
  {
    id: 'videoSettings.margin.right_gu',
    type: 'number',
    defaultValue: 0,
    step: 1,
  },
  {
    id: 'videoSettings.margin.top_gu',
    type: 'number',
    defaultValue: 0,
    step: 1,
  },
  {
    id: 'videoSettings.margin.bottom_gu',
    type: 'number',
    defaultValue: 0,
    step: 1,
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
    id: 'text.offset_x_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.1,
  },
  {
    id: 'text.offset_y_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.1,
  },
  {
    id: 'text.rotation_deg',
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
    id: 'text.fontSize_gu',
    type: 'number',
    defaultValue: 2.5,
    step: 0.1,
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
    id: 'image.height_gu',
    type: 'number',
    defaultValue: 12,
    step: 1,
  },
  {
    id: 'image.margin_gu',
    type: 'number',
    defaultValue: 1.5,
    step: 0.1,
  },
  {
    id: 'image.opacity',
    type: 'number',
    defaultValue: 1,
    step: 0.1,
  },
  {
    id: 'image.enableFade',
    type: 'boolean',
    defaultValue: true,
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

  // -- opening slate (a.k.a. start titles) params --
  {
    id: 'openingSlate.duration_secs',
    type: 'number',
    defaultValue: 4,
    shortHelpText:
      'The slate is shown for this amount of time when the stream starts.',
  },
  {
    id: 'openingSlate.title',
    type: 'text',
    defaultValue: 'Welcome',
  },
  {
    id: 'openingSlate.subtitle',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'openingSlate.bgImageAssetName',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'openingSlate.bgColor',
    type: 'text',
    defaultValue: 'rgba(0, 0, 0, 1)',
  },
  {
    id: 'openingSlate.textColor',
    type: 'text',
    defaultValue: 'rgba(255, 255, 255, 1)',
  },
  {
    id: 'openingSlate.fontFamily',
    type: 'enum',
    defaultValue: 'Bitter',
    values: fontFamilies,
  },
  {
    id: 'openingSlate.fontWeight',
    type: 'enum',
    defaultValue: '500',
    values: fontWeights,
  },
  {
    id: 'openingSlate.fontStyle',
    type: 'enum',
    defaultValue: '',
    values: ['normal', 'italic'],
  },
  {
    id: 'openingSlate.fontSize_gu',
    type: 'number',
    defaultValue: 2.5,
    step: 0.1,
  },
  {
    id: 'openingSlate.subtitle.fontSize_pct',
    type: 'number',
    defaultValue: 75,
    step: 1,
  },
  {
    id: 'openingSlate.subtitle.fontWeight',
    type: 'enum',
    defaultValue: '400',
    values: fontWeights,
  },

  // -- title slate params --
  {
    id: 'titleSlate.title',
    type: 'text',
    defaultValue: 'Title slate',
  },
  {
    id: 'titleSlate.subtitle',
    type: 'text',
    defaultValue: 'Subtitle',
  },
  {
    id: 'titleSlate.bgImageAssetName',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'titleSlate.bgColor',
    type: 'text',
    defaultValue: 'rgba(0, 0, 0, 1)',
  },
  {
    id: 'titleSlate.textColor',
    type: 'text',
    defaultValue: 'rgba(255, 255, 255, 1)',
  },
  {
    id: 'titleSlate.fontFamily',
    type: 'enum',
    defaultValue: 'Bitter',
    values: fontFamilies,
  },
  {
    id: 'titleSlate.fontWeight',
    type: 'enum',
    defaultValue: '500',
    values: fontWeights,
  },
  {
    id: 'titleSlate.fontStyle',
    type: 'enum',
    defaultValue: '',
    values: ['normal', 'italic'],
  },
  {
    id: 'titleSlate.fontSize_gu',
    type: 'number',
    defaultValue: 2.5,
    step: 0.1,
  },
  {
    id: 'titleSlate.subtitle.fontSize_pct',
    type: 'number',
    defaultValue: 75,
    step: 1,
  },
  {
    id: 'titleSlate.subtitle.fontWeight',
    type: 'enum',
    defaultValue: '400',
    values: fontWeights,
  },
];
