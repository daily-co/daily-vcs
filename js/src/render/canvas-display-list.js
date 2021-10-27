
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

class CanvasEncodingContext {
  constructor(encoder) {
    this.encoder = encoder;
    this.cmds = encoder.cmds;
  }

  encodeCmd(cmd, params) {
    const arr = [ cmd ];
    if (params) arr.push(params);
    this.cmds.push(arr);
  }

  set fillStyle(v) {
    this.encodeCmd('fillStyle', v);
  }

  set font(v) {
    this.encodeCmd('font', v);
  }

  save() {
    this.encodeCmd('save');
  }

  restore() {
    this.encodeCmd('restore');
  }

  clip() {
    this.encodeCmd('clip');
  }

  fillRect(...args) {
    this.encodeCmd('fillRect', args);
  }

  fillText(...args) {
    this.encodeCmd('fillText', args);
  }

  drawImage_vcsDrawable(srcDrawable, ...args) {
    // we assume that the VCS library has set these properties
    // for any image/video objects that it passes as inputs
    const srcDesc = {
      type: srcDrawable.vcsSourceType,
      id: srcDrawable.vcsSourceId
    };
    
    this.encodeCmd('drawImage', [ srcDesc ].concat(args));
  }

  beginPath() {
    this.encodeCmd('beginPath');
  }

  closePath() {
    this.encodeCmd('closePath');
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
