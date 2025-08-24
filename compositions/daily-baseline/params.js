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
    id: 'showBannerOverlay',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'showWebFrameOverlay',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'showSidebar',
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
    id: 'videoSettings.maxCamStreams',
    type: 'number',
    defaultValue: 25,
    shortHelpText:
      'Limits the number of non-screenshare streams that are included in the output.',
  },
  {
    id: 'videoSettings.preferredParticipantIds',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'videoSettings.preferScreenshare',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'videoSettings.omitPausedVideo',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'videoSettings.omitAudioOnly',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'videoSettings.omitExtraScreenshares',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'videoSettings.omitPausedNotScreensharing',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'videoSettings.filterForUnpausedMediaTypes',
    type: 'text',
    defaultValue: '',
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
    id: 'videoSettings.cornerRadius_gu',
    type: 'number',
    defaultValue: 1.2,
    step: 0.1,
  },
  {
    id: 'videoSettings.scaleMode',
    type: 'enum',
    defaultValue: 'fill',
    values: ['fill', 'fit'],
  },
  {
    id: 'videoSettings.scaleModeForScreenshare',
    type: 'enum',
    defaultValue: 'fit',
    values: ['fill', 'fit'],
  },
  {
    id: 'videoSettings.zoomFactorsList',
    type: 'text',
    defaultValue: '',
    experimental: true,
  },
  {
    id: 'videoSettings.placeholder.bgColor',
    type: 'text',
    defaultValue: 'rgb(0, 50, 80)',
  },
  {
    id: 'videoSettings.highlight.color',
    type: 'text',
    defaultValue: 'rgb(255, 255, 255)',
  },
  {
    id: 'videoSettings.highlight.stroke_gu',
    type: 'number',
    defaultValue: 0.2,
    step: 0.05,
  },
  {
    id: 'videoSettings.split.margin_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.1,
  },
  {
    id: 'videoSettings.split.direction',
    type: 'enum',
    defaultValue: 'auto-by-viewport',
    values: ['auto-by-viewport', 'vertical', 'horizontal'],
  },
  {
    id: 'videoSettings.split.scaleModeOverrides',
    type: 'text',
    defaultValue: '',
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
    id: 'videoSettings.grid.highlightDominant',
    type: 'boolean',
    defaultValue: true,
  },
  {
    id: 'videoSettings.grid.preserveAspectRatio',
    type: 'boolean',
    defaultValue: true,
  },
  {
    id: 'videoSettings.grid.fullScreenHighlightItemIndex',
    type: 'number',
    defaultValue: -1,
    step: 1,
  },

  {
    id: 'videoSettings.dominant.position',
    type: 'enum',
    defaultValue: PositionEdge.LEFT,
    values: Object.values(PositionEdge),
  },
  {
    id: 'videoSettings.dominant.centerItems',
    type: 'boolean',
    defaultValue: false,
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
    id: 'videoSettings.dominant.splitMargin_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.1,
  },
  {
    id: 'videoSettings.dominant.sharpCornersOnMain',
    type: 'boolean',
    defaultValue: true,
  },
  {
    id: 'videoSettings.dominant.includeWebFrame',
    type: 'boolean',
    defaultValue: false,
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
    id: 'videoSettings.pip.sharpCornersOnMain',
    type: 'boolean',
    defaultValue: true,
  },
  {
    id: 'videoSettings.pip.includeWebFrame',
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
    id: 'text.source',
    type: 'enum',
    defaultValue: 'param',
    values: ['param', 'highlightLines.items', 'chatMessages', 'transcript'],
    shortHelpText:
      'Override the text content from a standard source like transcription.',
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
    id: 'text.scale_x',
    type: 'number',
    defaultValue: 1,
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
    defaultValue: 'DMSans',
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
  {
    id: 'text.stroke_gu',
    type: 'number',
    defaultValue: 0.5,
    step: 0.05,
  },
  {
    id: 'text.highlight.color',
    type: 'text',
    defaultValue: 'rgba(255, 255, 0, 1)',
  },
  {
    id: 'text.highlight.fontWeight',
    type: 'enum',
    defaultValue: '700',
    values: fontWeights,
  },

  // -- image overlay params --
  {
    id: 'image.assetName',
    type: 'text',
    defaultValue: 'overlay.png',
  },
  {
    id: 'image.emoji',
    type: 'text',
    defaultValue: '',
    shortHelpText:
      'Set this value to use a single emoji instead of an image asset.',
  },
  {
    id: 'image.position',
    type: 'enum',
    defaultValue: PositionCorner.TOP_RIGHT,
    values: Object.values(PositionCorner),
  },
  {
    id: 'image.zPosition',
    type: 'enum',
    defaultValue: 'foreground',
    values: ['foreground', 'background'],
  },
  {
    id: 'image.fullScreen',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'image.fullScreenScaleMode',
    type: 'enum',
    defaultValue: 'fit',
    values: ['fill', 'fit'],
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

  // -- webframe overlay params --
  {
    id: 'webFrame.url',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'webFrame.viewportWidth_px',
    type: 'number',
    defaultValue: 1280,
    step: 1,
  },
  {
    id: 'webFrame.viewportHeight_px',
    type: 'number',
    defaultValue: 720,
    step: 1,
  },
  {
    id: 'webFrame.position',
    type: 'enum',
    defaultValue: PositionCorner.TOP_RIGHT,
    values: Object.values(PositionCorner),
  },
  {
    id: 'webFrame.zPosition',
    type: 'enum',
    defaultValue: 'foreground',
    values: ['foreground', 'background'],
  },
  {
    id: 'webFrame.fullScreen',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'webFrame.height_gu',
    type: 'number',
    defaultValue: 12,
    step: 1,
  },
  {
    id: 'webFrame.margin_gu',
    type: 'number',
    defaultValue: 1.5,
    step: 0.1,
  },
  {
    id: 'webFrame.opacity',
    type: 'number',
    defaultValue: 1,
    step: 0.1,
  },
  {
    id: 'webFrame.enableFade',
    type: 'boolean',
    defaultValue: true,
  },
  {
    id: 'webFrame.keyPress.keyName',
    type: 'text',
    defaultValue: 'ArrowRight',
  },
  {
    id: 'webFrame.keyPress.modifiers',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'webFrame.keyPress.key',
    type: 'number',
    defaultValue: 0,
    shortHelpText: "To send a keyboard press, increment the value of 'key'",
  },

  // -- lower third params --
  {
    id: 'banner.title',
    type: 'text',
    defaultValue: 'Hello world',
  },
  {
    id: 'banner.subtitle',
    type: 'text',
    defaultValue: 'This is an example subtitle',
  },
  {
    id: 'banner.source',
    type: 'enum',
    defaultValue: 'param',
    values: ['param', 'highlightLines.items', 'chatMessages', 'transcript'],
    shortHelpText:
      'Override this content from a standard source like transcription.',
  },
  {
    id: 'banner.position',
    type: 'enum',
    defaultValue: PositionCorner.BOTTOM_LEFT,
    values: Object.values(PositionCorner),
  },
  {
    id: 'banner.enableTransition',
    type: 'boolean',
    defaultValue: true,
  },
  {
    id: 'banner.margin_x_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.5,
  },
  {
    id: 'banner.margin_y_gu',
    type: 'number',
    defaultValue: 1,
    step: 0.5,
  },
  {
    id: 'banner.padding_gu',
    type: 'number',
    defaultValue: 2,
    step: 0.1,
  },
  {
    id: 'banner.alwaysUseMaxW',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'banner.maxW_pct_default',
    type: 'number',
    defaultValue: 65,
  },
  {
    id: 'banner.maxW_pct_portrait',
    type: 'number',
    defaultValue: 90,
  },
  {
    id: 'banner.rotation_deg',
    type: 'number',
    defaultValue: 0,
  },
  {
    id: 'banner.cornerRadius_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.1,
  },
  {
    id: 'banner.showIcon',
    type: 'boolean',
    defaultValue: true,
  },
  {
    id: 'banner.icon.assetName',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'banner.icon.emoji',
    type: 'text',
    defaultValue: '🎉',
    shortHelpText:
      'Set this value to use a single emoji instead of an image asset as the icon.',
  },
  {
    id: 'banner.icon.size_gu',
    type: 'number',
    defaultValue: 3,
  },
  {
    id: 'banner.color',
    type: 'text',
    defaultValue: 'rgba(50, 60, 200, 0.9)',
  },
  {
    id: 'banner.strokeColor',
    type: 'text',
    defaultValue: 'rgba(0, 0, 30, 0.44)',
  },
  {
    id: 'banner.stroke_gu',
    type: 'number',
    defaultValue: 0,
    step: 0.05,
  },
  {
    id: 'banner.text.color',
    type: 'text',
    defaultValue: 'white',
  },
  {
    id: 'banner.text.strokeColor',
    type: 'text',
    defaultValue: 'rgba(0, 0, 0, 0.1)',
  },
  {
    id: 'banner.text.stroke_gu',
    type: 'number',
    defaultValue: 0.5,
    step: 0.05,
  },
  {
    id: 'banner.text.fontFamily',
    type: 'enum',
    defaultValue: 'Roboto',
    values: fontFamilies,
  },
  {
    id: 'banner.title.fontSize_gu',
    type: 'number',
    defaultValue: 2,
    step: 0.1,
  },
  {
    id: 'banner.title.fontWeight',
    type: 'enum',
    defaultValue: '500',
    values: fontWeights,
  },
  {
    id: 'banner.title.fontStyle',
    type: 'enum',
    defaultValue: '',
    values: ['normal', 'italic'],
  },
  {
    id: 'banner.subtitle.fontSize_gu',
    type: 'number',
    defaultValue: 1.5,
    step: 0.1,
  },
  {
    id: 'banner.subtitle.fontWeight',
    type: 'enum',
    defaultValue: '300',
    values: fontWeights,
  },
  {
    id: 'banner.subtitle.fontStyle',
    type: 'enum',
    defaultValue: '',
    values: ['normal', 'italic'],
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
    id: 'toast.source',
    type: 'enum',
    defaultValue: 'param',
    values: ['param', 'chatMessages', 'transcript'],
    shortHelpText:
      'Override this content from a standard source like transcription.',
  },
  {
    id: 'toast.duration_secs',
    type: 'number',
    defaultValue: 4,
  },
  {
    id: 'toast.maxW_pct_default',
    type: 'number',
    defaultValue: 50,
  },
  {
    id: 'toast.maxW_pct_portrait',
    type: 'number',
    defaultValue: 80,
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
    id: 'toast.icon.emoji',
    type: 'text',
    defaultValue: '🎉',
    shortHelpText:
      'Set this value to use a single emoji instead of an image asset as the icon.',
  },
  {
    id: 'toast.icon.size_gu',
    type: 'number',
    defaultValue: 3,
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
    id: 'titleSlate.enableTransition',
    type: 'boolean',
    defaultValue: true,
  },
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

  // -- sidebar params --
  {
    id: 'sidebar.shrinkVideoLayout',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'sidebar.source',
    type: 'enum',
    defaultValue: 'highlightLines.items',
    values: ['highlightLines.items', 'chatMessages', 'transcript'],
    shortHelpText: 'Choose where the sidebar gets its content.',
  },
  {
    id: 'sidebar.padding_gu',
    type: 'number',
    defaultValue: 1.5,
    step: 0.1,
  },
  {
    id: 'sidebar.width_pct_landscape',
    type: 'number',
    defaultValue: 30,
  },
  {
    id: 'sidebar.height_pct_portrait',
    type: 'number',
    defaultValue: 25,
    shortHelpText:
      'The sidebar is displayed at the bottom when the output size is portrait or square. This param sets its height in that mode.',
  },
  {
    id: 'sidebar.bgColor',
    type: 'text',
    defaultValue: 'rgba(0, 0, 50, 0.55)',
  },
  {
    id: 'sidebar.textColor',
    type: 'text',
    defaultValue: 'rgba(255, 255, 255, 0.94)',
  },
  {
    id: 'sidebar.fontFamily',
    type: 'enum',
    defaultValue: 'DMSans',
    values: fontFamilies,
  },
  {
    id: 'sidebar.fontWeight',
    type: 'enum',
    defaultValue: '300',
    values: fontWeights,
  },
  {
    id: 'sidebar.fontStyle',
    type: 'enum',
    defaultValue: '',
    values: ['normal', 'italic'],
  },
  {
    id: 'sidebar.fontSize_gu',
    type: 'number',
    defaultValue: 1.4,
    step: 0.1,
  },
  {
    id: 'sidebar.textHighlight.color',
    type: 'text',
    defaultValue: 'rgba(255, 230, 0, 1)',
  },
  {
    id: 'sidebar.textHighlight.fontWeight',
    type: 'enum',
    defaultValue: '600',
    values: fontWeights,
  },

  // -- highlightLines params --
  {
    id: 'highlightLines.items',
    type: 'text',
    textSizeHint: 'long',
    defaultValue:
      'Introduction\nNotes from the conference\nInterview with Jane Doe\nQ & A',
    shortHelpText:
      'To display the data configured here, set the "source" param available on components like TextOverlay, Banner and Sidebar.',
  },
  {
    id: 'highlightLines.position',
    type: 'number',
    defaultValue: 0,
    shortHelpText: 'To remove the highlight, set position to -1.',
  },

  // -- emoji reactions params --
  {
    id: 'emojiReactions.source',
    type: 'enum',
    defaultValue: 'emojiReactions',
    values: ['emojiReactions', 'param'],
    shortHelpText:
      "To send a reaction using param values instead of the standard source, set this to 'param', set 'emoji' below, and increment the value of 'key'.",
  },
  {
    id: 'emojiReactions.key',
    type: 'number',
    defaultValue: 0,
  },
  {
    id: 'emojiReactions.emoji',
    type: 'text',
    defaultValue: '',
  },
  {
    id: 'emojiReactions.offset_x_gu',
    type: 'number',
    defaultValue: 0,
    step: 1,
  },

  // -- debug params --
  {
    id: 'debug.showRoomState',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'debug.overlayOpacity',
    type: 'number',
    defaultValue: 90,
    step: 1,
  },
];
