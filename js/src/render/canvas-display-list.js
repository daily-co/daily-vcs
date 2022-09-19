// generated from data at https://www.w3schools.com/colors/colors_names.asp
const cssColors = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

export class CanvasDisplayListEncoder {
  constructor(w, h) {
    this.width = w;
    this.height = h;

    this.cmds = [];
  }

  getContext() {
    return new CanvasEncodingContext(this);
  }

  finalize() {
    return {
      width: this.width,
      height: this.height,
      commands: this.cmds,
    };
  }
}

// we don't want to encode named CSS colors because then those have to be parsed in canvex.
// instead normalize the named colors here and always write rgb[a].
function normalizeColorValue(c) {
  if (!c) return '#000';

  // allow rgb[a] arrays because they're useful for computed colors
  if (Array.isArray(c)) {
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] !== undefined ? c[3] : 1})`;
  }

  if (typeof c !== 'string') {
    console.error('** Unsupported CSS color value, not a string: ' + c);
    return '#000';
  }

  if (c.indexOf('#') === 0 || c.indexOf('rgb') === 0) {
    return c;
  }
  const mapped = cssColors[c];
  if (mapped) {
    return mapped;
  }
  console.error(
    '** Unsupported CSS color value for display list encoding: ' + c
  );
  return '#fff';
}

class CanvasEncodingContext {
  constructor(encoder) {
    this.encoder = encoder;
    this.cmds = encoder.cmds;
  }

  encodeCmd(cmd, params) {
    const arr = [cmd];
    if (params !== undefined) arr.push(params);
    this.cmds.push(arr);
  }

  set fillStyle(v) {
    this.encodeCmd('fillStyle', normalizeColorValue(v));
  }

  set strokeStyle(v) {
    this.encodeCmd('strokeStyle', normalizeColorValue(v));
  }

  set lineWidth(v) {
    this.encodeCmd('lineWidth', v);
  }

  set lineJoin(v) {
    this.encodeCmd('lineJoin', v);
  }

  set font(v) {
    this.encodeCmd('font', v);
  }

  set globalAlpha(v) {
    this.encodeCmd('globalAlpha', v);
  }

  save() {
    this.encodeCmd('save');
  }

  restore() {
    const n = this.cmds.length;
    if (n > 0 && this.cmds[n - 1][0] === 'save') {
      // don't bother encoding empty save-restore pairs
      this.cmds.splice(n - 1, 1);
      return;
    }
    this.encodeCmd('restore');
  }

  scale(...args) {
    this.encodeCmd('scale', args);
  }

  rotate(...args) {
    this.encodeCmd('rotate', args);
  }

  translate(...args) {
    this.encodeCmd('translate', args);
  }

  clip() {
    this.encodeCmd('clip');
  }

  fill() {
    this.encodeCmd('fill');
  }

  stroke() {
    this.encodeCmd('stroke');
  }

  fillRect(...args) {
    this.encodeCmd('fillRect', args);
  }

  strokeRect(...args) {
    this.encodeCmd('strokeRect', args);
  }

  fillText(...args) {
    this.encodeCmd('fillText', args);
  }

  strokeText(...args) {
    this.encodeCmd('strokeText', args);
  }

  drawImage_vcsDrawable(srcDrawable, ...args) {
    // we assume that the VCS library has set these properties
    // for any image/video objects that it passes as inputs
    const srcDesc = {
      type: srcDrawable.vcsSourceType,
      id: srcDrawable.vcsSourceId,
    };

    if (srcDrawable.liveAssetUpdateKey) {
      srcDesc.id = `${srcDesc.id}#${srcDrawable.liveAssetUpdateKey}`;
    }

    this.encodeCmd('drawImage', [srcDesc].concat(args));
  }

  beginPath() {
    this.encodeCmd('beginPath');
  }

  closePath() {
    this.encodeCmd('closePath');
  }

  rect(...args) {
    this.encodeCmd('rect', args);
  }

  ellipse(...args) {
    this.encodeCmd('ellipse', args);
  }

  moveTo(...args) {
    this.encodeCmd('moveTo', args);
  }

  lineTo(...args) {
    this.encodeCmd('lineTo', args);
  }

  quadraticCurveTo(...args) {
    this.encodeCmd('quadraticCurveTo', args);
  }
}
