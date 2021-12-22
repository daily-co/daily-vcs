import { v4 as uuidv4 } from 'uuid';
import { CanvasDisplayListEncoder } from '../src/render/canvas-display-list';
import {
  encodeCanvasDisplayList_fg,
  encodeCanvasDisplayList_videoLayersPreview,
} from '../src/render/canvas';
import { encodeCompVideoSceneDesc } from '../src/render/video-scenedesc';

// these are the intrinsic elements that our React components are ultimately composed of.
// (think similar to 'div', 'img' etc. in React-DOM)
export const IntrinsicNodeType = {
  ROOT: 'root',
  BOX: 'box',
  IMAGE: 'image',
  LABEL: 'label',
  VIDEO: 'video',
};

export class Composition {
  constructor(cb) {
    this.nodes = [];
    this.rootNode = null;

    this.uncommitted = true;
    this.commitFinishedCb = cb;

    this.viewportSize = { w: 1280, h: 720 };
  }

  createNode(type, props) {
    let node;
    switch (type) {
      case IntrinsicNodeType.ROOT:
        node = new RootNode();
        break;
      case IntrinsicNodeType.BOX:
        node = new BoxNode();
        break;
      case IntrinsicNodeType.IMAGE:
        node = new ImageNode();
        break;
      case IntrinsicNodeType.LABEL:
        node = new LabelNode();
        break;
      case IntrinsicNodeType.VIDEO:
        node = new VideoNode();
        break;
    }

    if (!node) {
      console.error("** couldn't create node: ", type, props);
    } else {
      this.nodes.push(node);
    }

    node.commit(this, {}, props);

    return node;
  }

  deleteNode(node) {
    const idx = this.nodes.indexOf(node);
    this.nodes.splice(idx, 1);

    //console.log("deleted node at %d in array", idx)
  }

  attachRootNode(node) {
    this.rootNode = node;
    for (const node of this.nodes) {
      node.container = this;
    }
  }

  prepareForFirstCommit() {
    //console.log("prepare for first commit; we have %d nodes", this.nodes.length);

    this.uncommitted = false;
  }

  reactFinishedCommits() {
    this._performLayout();

    if (this.commitFinishedCb) {
      this.commitFinishedCb(this);
    }
  }

  _performLayout() {
    if (!this.rootNode) return;

    const layoutCtxBase = {
      viewport: { x: 0, y: 0, w: this.viewportSize.w, h: this.viewportSize.h },
    };

    function recurseLayout(node, parentFrame) {
      let frame = { ...parentFrame };
      if (node.layoutFunc) {
        frame = node.layoutFunc(frame, node.layoutParams, {
          ...layoutCtxBase,
          node,
        });
      }
      node.layoutFrame = frame;
      //console.log("frame for node '%s' (%s): ", node.userGivenId, node.constructor.nodeType, JSON.stringify(node.layoutFrame));

      for (const c of node.children) {
        recurseLayout(c, frame);
      }
    }

    recurseLayout(this.rootNode, layoutCtxBase.viewport);
  }

  writeSceneDescription(imageSources) {
    if (!this.rootNode) return {};

    // get foreground graphics as a display list
    const encoder = new CanvasDisplayListEncoder(
      this.viewportSize.w,
      this.viewportSize.h
    );

    encodeCanvasDisplayList_fg(this, encoder, imageSources);

    const fgDisplayList = encoder.finalize();

    // get video elements
    const videoLayers = encodeCompVideoSceneDesc(this, imageSources);

    return {
      videoLayers,
      fgDisplayList,
    };
  }

  writeVideoLayersPreview() {
    // write a display list that can be used to render a preview
    const encoder = new CanvasDisplayListEncoder(
      this.viewportSize.w,
      this.viewportSize.h
    );

    encodeCanvasDisplayList_videoLayersPreview(this, encoder);

    return encoder.finalize();
  }
}

// NaN messes up params value comparison, remove it early
function cleanLayoutParams(obj) {
  let obj2;
  for (const k in obj) {
    const v = obj[k];
    if (Number.isNaN(v)) {
      if (!obj2) obj2 = {...obj};
      delete obj2[k];
    }
  }
  return obj2 || obj;
}

function isEqualLayoutProps(oldFn, oldParams, newFn, newParams) {
  if (!oldFn && !newFn) return true;

  if (oldFn !== newFn) return false;

  if (newParams || oldParams) {
    if (newParams && !oldParams) return false;
    if (oldParams && !newParams) return false;

    for (const k in oldParams) {
      if (oldParams[k] !== newParams[k]) return false;
    }
    for (const k in newParams) {
      if (oldParams[k] !== newParams[k]) return false;
    }
  }
  return true;
}

function isEqualStyleOrTransform(oldStyle, newStyle) {
  if (!oldStyle && !newStyle) return true;
  if (newStyle && !oldStyle) return false;
  if (oldStyle && !newStyle) return false;

  for (const k in oldStyle) {
    if (oldStyle[k] !== newStyle[k]) return false;
  }
  for (const k in newStyle) {
    if (oldStyle[k] !== newStyle[k]) return false;
  }
  return true;
}

class NodeBase {
  static nodeType = null; // abstract base class

  constructor() {
    this.uuid = uuidv4();
    this.userGivenId = '';

    this.parent = null;
    this.children = [];
    this.container = null;

    this.layoutFunc = null;
    this.layoutParams = {};
  }

  shouldUpdate(container, oldProps, newProps) {
    // should return true only if the newProps represent a change that requires a commit

    //console.log("shouldupdate %s, '%s'", this.uuid, newProps.id);

    let newLayout = [];
    if (newProps.layout) {
      if (!Array.isArray(newProps.layout)) {
        console.warn('invalid layout prop passed to node: ', newProps.layout);
      } else {
        newLayout = newProps.layout;
      }
    }
    if (
      !isEqualLayoutProps(
        this.layoutFunc,
        this.layoutParams,
        newLayout[0],
        newLayout[1] ? cleanLayoutParams(newLayout[1]) : {}
      )
    ) {
      //console.log("layout props will be updated for '%s'", newProps.id || '');
      return true;
    }

    return false;
  }

  commit(container, oldProps, newProps) {
    //console.log("commit %s: ", this.uuid, newProps)

    if (newProps.id) this.userGivenId = newProps.id;

    if (Array.isArray(newProps.layout)) {
      const params = newProps.layout[1];

      this.layoutFunc = newProps.layout[0];
      this.layoutParams = params ? cleanLayoutParams(params) : {};
      //console.log("new layout for '%s': ", this.userGivenId, this.layoutFunc, JSON.stringify(this.layoutParams));
    } else {
      this.layoutFunc = null;
      this.layoutParams = {};
    }
  }

  delete() {
    //console.log("child delete");

    this.parent = null;

    if (this.container) {
      this.container.deleteNode(this);
      this.container = null;
    }
  }

  serialize() {
    const obj = {
      type: this.constructor.nodeType,
    };
    if (this.children.length > 0) {
      obj.children = [];
      for (const c of this.children) {
        obj.children.push(c.serialize());
      }
    }
    return obj;
  }
}

class RootNode extends NodeBase {
  static nodeType = IntrinsicNodeType.ROOT;

  constructor() {
    super();
    this.userGivenId = '__root';
  }
}

class StyledNodeBase extends NodeBase {
  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (!isEqualStyleOrTransform(oldProps.style, newProps.style)) return true;

    if (!isEqualStyleOrTransform(oldProps.transform, newProps.transform))
      return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    this.style = newProps.style;

    // we should compute a 2D transformation matrix at this point
    // and encapsulate any scale / rotate / anchor point props there
    // to make rendering easier (so that targets don't have to compute this
    // same stuff over again).
    // for now, just pass through the object received from the composition.
    this.transform = newProps.transform;
  }
}

class BoxNode extends StyledNodeBase {
  static nodeType = IntrinsicNodeType.BOX;
}

class LabelNode extends StyledNodeBase {
  static nodeType = IntrinsicNodeType.LABEL;

  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (oldProps.text !== newProps.text) return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    this.text = newProps.text;
  }
}

class ImageNode extends StyledNodeBase {
  static nodeType = IntrinsicNodeType.IMAGE;

  shouldUpdate(container, oldProps, newProps) {
    if (super.shouldUpdate(container, oldProps, newProps)) return true;

    if (oldProps.src !== newProps.src) return true;

    return false;
  }

  commit(container, oldProps, newProps) {
    super.commit(container, oldProps, newProps);

    this.src = newProps.src;
  }
}

class VideoNode extends ImageNode {
  // inherits 'src'
  static nodeType = IntrinsicNodeType.VIDEO;
}
