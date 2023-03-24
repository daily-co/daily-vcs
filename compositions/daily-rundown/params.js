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

export const compositionParams = [
  {
    id: 'rundown.items',
    type: 'text',
    textSizeHint: 'long',
    defaultValue:
      'Introduction, Notes from the conference, Interview with Jane Doe, Q & A',
  },
  {
    id: 'rundown.position',
    type: 'number',
    defaultValue: 0,
  },

  {
    id: 'video.guestName',
    type: 'text',
    defaultValue: '',
  },

  {
    id: 'poll.question',
    type: 'text',
    defaultValue: 'To be or not to be?',
  },
  {
    id: 'poll.showResult',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'poll.yesVotes',
    type: 'number',
    defaultValue: 0,
  },
  {
    id: 'poll.noVotes',
    type: 'number',
    defaultValue: 0,
  },

  {
    id: 'assets.logo',
    type: 'text',
    defaultValue: 'logo.png',
  },
  {
    id: 'assets.header',
    type: 'text',
    defaultValue: 'header.png',
  },

  {
    id: 'colors.logo.bg',
    type: 'text',
    defaultValue: '#470f02',
  },
  {
    id: 'colors.rundown.bg',
    type: 'text',
    defaultValue: '#03223b',
  },
  {
    id: 'colors.rundown.text',
    type: 'text',
    defaultValue: 'rgba(200, 240, 255, 0.9)',
  },
  {
    id: 'colors.rundown.highlight',
    type: 'text',
    defaultValue: 'yellow',
  },

  {
    id: 'textStyles.fontFamily',
    type: 'enum',
    defaultValue: 'RobotoCondensed',
    values: fontFamilies,
  },
  {
    id: 'textStyles.fontWeight',
    type: 'enum',
    defaultValue: '400',
    values: fontWeights,
  },
  {
    id: 'textStyles.baseFontSize_pct',
    type: 'number',
    defaultValue: 100,
  },
  {
    id: 'textStyles.rundown.uppercaseItems',
    type: 'boolean',
    defaultValue: true,
  },

  {
    id: 'logoSidebar.hidden',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'logoSidebar.showTitleInsteadOfImage',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'logoSidebar.title',
    type: 'text',
    defaultValue: 'Your show name',
  },
  {
    id: 'logoSidebar.title.fontWeight',
    type: 'enum',
    defaultValue: '400',
    values: fontWeights,
  },
  {
    id: 'logoSidebar.title.fontSize_pct',
    type: 'number',
    defaultValue: 140,
  },

  {
    id: 'rundownSidebar.hidden',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'rundownSidebar.showTitleInsteadOfImage',
    type: 'boolean',
    defaultValue: false,
  },
  {
    id: 'rundownSidebar.title',
    type: 'text',
    defaultValue: 'Coming up:',
  },
  {
    id: 'rundownSidebar.title.fontWeight',
    type: 'enum',
    defaultValue: '400',
    values: fontWeights,
  },
  {
    id: 'rundownSidebar.title.fontSize_pct',
    type: 'number',
    defaultValue: 100,
  },
];
