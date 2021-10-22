import { v4 as uuidv4 } from 'uuid';


// these are the intrinsic elements that our React components are ultimately composed of.
// (think similar to 'div', 'img' etc. in React-DOM)
const IntrinsicNodeType = {
  ROOT: 'root',
  BOX: 'box',
  VIDEO: 'video',
  IMAGE: 'image',
};

export class Composition {
  constructor(cb) {
    this.nodes = [];
    this.rootNode = null;

    this.uncommitted = true;

    this.commitFinishedCb = cb;
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
      case IntrinsicNodeType.VIDEO:
        node = new VideoNode();
        break;
      case IntrinsicNodeType.IMAGE:
        node = new ImageNode();
        break;
      }

    if ( !node) {
      console.log("** couldn't create node: ", type, props);
    } else {
      this.nodes.push(node);
    }

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
    if (this.commitFinishedCb) {
      this.commitFinishedCb(this);
    }
  }

  serialize() {
    if (this.rootNode) {
      return this.rootNode.serialize();
    }
    return {};
  }
}

class NodeBase {
  static nodeType = null; // abstract base class

  constructor() {
    this.uuid = uuidv4();
    this.parent = null;
    this.children = [];
    this.container = null;
  }

  shouldUpdate(container, oldProps, newProps) {
    // should return true only if the newProps represent a change that requires a commit
    return newProps != null;
  }

  commit(container, oldProps, newProps) {    
    //console.log("commit %s: ", this.uuid, newProps)

    if (newProps.id) this.userGivenId = newProps.id;
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

class BoxNode extends NodeBase {
  static nodeType = IntrinsicNodeType.BOX;
}

class VideoNode extends NodeBase {
  static nodeType = IntrinsicNodeType.VIDEO;
}

class ImageNode extends NodeBase {
  static nodeType = IntrinsicNodeType.IMAGE;

  shouldUpdate(container, oldProps, newProps) {
    if (newProps.layoutFn !== oldProps.layoutFn) {
      console.log("image layoutFn updated");
    }
  }

  commit(container, oldProps, newProps) {
    this.layoutFn = newProps.layoutFn;
  }

}
