export const DEFAULT_FONT = 'Roboto';
export const DEFAULT_CORNER_RADIUS_PX = 25;
export const DEFAULT_LABEL_FONT_SIZE_PX = 20;
export const DEFAULT_TOAST_FONT_SIZE_PX = 22;

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
