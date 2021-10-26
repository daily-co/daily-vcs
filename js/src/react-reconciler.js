import * as Reconciler from 'react-reconciler';
import {
  unstable_now as now,
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_shouldYield as shouldYield,
  unstable_cancelCallback as cancelDeferredCallback
} from 'scheduler';

// -- reconciler singleton --
//
const reconciler = createReconciler({
  prepareForCommit,
  createInstance,
  createTextInstance,
  appendInitialChild: appendChild,
  appendChild,
  appendChildToContainer,
  prepareUpdate,
  commitUpdate,
  insertBefore,
  removeChild,
  removeChildFromContainer,
  resetAfterCommit,
  clearContainer
});

// -- utility to create our custom reconciler with sensible defaults --
//
function createReconciler(cfg) {
  const NOOP = () => undefined
  const IDENTITY = v => v

  return Reconciler({
    getPublicInstance: IDENTITY,
    getRootHostContext: IDENTITY,
    getChildHostContext: IDENTITY,
    prepareUpdate: () => true,
    shouldSetTextContent: () => false,
    shouldDeprioritizeSubtree: () => false,
    createTextInstance: NOOP,
    finalizeInitialChildren: NOOP,
    scheduleDeferredCallback,
    cancelDeferredCallback,
    schedulePassiveEffects: scheduleDeferredCallback,
    cancelPassiveEffects: cancelDeferredCallback,
    shouldYield,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,
    now,
    isPrimaryRenderer: true,
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    commitTextUpdate: NOOP,
    commitMount: NOOP,
    resetTextContent: NOOP,
    hideInstance: NOOP,
    hideTextInstance: NOOP,
    unhideInstance: NOOP,
    unhideTextInstance: NOOP,

    ...cfg
  })
}


// -- the main entry point for our custom reconciler --
//
// first argument is the root component.
// second argument is the container that our reconciler will mutate.
// 
export function render(reactNode, composition, cb) {
  if (composition._reactRoot === undefined) {
    // only call createContainer once
    composition._reactRoot = reconciler.createContainer(composition, false, false);
  }
  return reconciler.updateContainer(reactNode, composition._reactRoot, null, cb);
}


// -- reconciler implementation methods --
//
// the 'container' argument to these functions is our composition
// (which was passed in the initial render() call above and retained by React)

function prepareForCommit(container) {
  // prepareForCommit is called before any update but also before initial 'appendChildToContainer'
  //console.log("-- prepare for commit --");
  if (container.uncommitted) {
    container.prepareForFirstCommit();
  }
  return null;
}

function resetAfterCommit(container) {
  //console.log("## reset after commit");
  container.reactFinishedCommits();
}

function createInstance(type, props, container) {
  //console.log("creating instance of type '%s' with props: ", type, Object.keys(props))
  return container.createNode(type, props);
}

function createTextInstance(text) {
  //console.log("createTextInstance: ", text);
}

function appendChild(parent, child) {
  if ( !child) {
    console.error("** appendChild with null child, parent: ", parent);
    return;
  }
  //console.log("appendChild: %s (%s) -> parent %s (%s)", child.uuid, child.userGivenId, parent.uuid, parent.userGivenId);
  parent.children.push(child);
  child.parent = parent;
}

function appendChildToContainer(container, child) {
  //console.log("root item set to: ", child.uuid);
  container.attachRootNode(child);
}

function removeChild(parent, child) {
  if ( !child) {
    console.error("** removeChild with null child, parent: ", parent);
    return;
  }
  //console.log("removeChild: %s (%s) -> parent %s (%s)", child.uuid, child.userGivenId, parent.uuid, parent.userGivenId);
  const idx = parent.children.indexOf(child);
  parent.children.splice(idx, 1);

  child.delete();
}

function removeChildFromContainer(container, child) {
  container.attachRootNode(null);
}

function clearContainer(container) {
  //console.log("## clear container");
  removeChildFromContainer(container);
}

function insertBefore(parent, child, before) {
  //console.log("insertBefore: %s (%s) -> parent %s (%s), before %s", child.uuid, child.userGivenId, parent.uuid, parent.userGivenId, before.uuid);
  appendChild(parent, child);
}

function prepareUpdate(node, type, oldProps, newProps, container) {
  //console.log("prepareUpdate, node %s (%s), type %s", node.uuid, node.userGivenId, type);
  const didChange = node.shouldUpdate(container, oldProps, newProps);
  return didChange ? container : null;
}

function commitUpdate(node, container, type, oldProps, newProps, handle) {
  node.commit(container, oldProps, newProps);
}


