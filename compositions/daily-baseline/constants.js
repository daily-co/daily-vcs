export const DEFAULT_FONT = 'Roboto';
export const DEFAULT_LABEL_FONT_SIZE_PX = 20;
export const DEFAULT_TOAST_FONT_SIZE_PX = 22;

export const DEFAULT_OFFSET_VIDEO_SINGLE_PX = 10;

export const PositionEdge = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
};

export const PositionCorner = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
};

// request all standard fonts
export const fontFamilies = [
  'Roboto',
  'RobotoCondensed',
  'Anton',
  'Bangers',
  'Bitter',
  'DMSans',
  'Exo',
  'Magra',
  'PermanentMarker',
  'SuezOne',
  'Teko',
];
// fonts that are legible at a small size (for participant labels)
export const fontFamilies_smallSizeFriendly = [
  'Roboto',
  'RobotoCondensed',
  'Bitter',
  'DMSans',
  'Exo',
  'Magra',
  'SuezOne',
  'Teko',
];
// not all fonts have every weight,
// but we can't currently filter the UI based on the font name
export const fontWeights = [
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
