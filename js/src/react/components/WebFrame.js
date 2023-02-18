import * as React from 'react';
import { useVideoTime } from '../hooks/index.js';

const WEBFRAME_UPDATE_FPS = 2;

export function WebFrame(props) {
  // currently we nudge a regular update of the webframe live asset by passing a frame index based on video time.
  // this triggers a re-render of the built-in component instance.
  const t = useVideoTime();
  const frameIntv = 1 / WEBFRAME_UPDATE_FPS; // seconds
  const frameIdx = 1 + Math.floor(t / frameIntv);

  const keyPressActionIsValid =
    props.keyPressAction &&
    props.keyPressAction.name &&
    props.keyPressAction.key;
  const keyPressAction = {
    name: keyPressActionIsValid ? props.keyPressAction.name : '',
    key: keyPressActionIsValid ? '' + props.keyPressAction.key : '',
    modifiers: keyPressActionIsValid ? props.keyPressAction.modifiers : '',
  };

  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement('webframe', {
    id: props.id,
    layout: props.layout,
    style: props.style || {},
    transform: props.transform || {},
    scaleMode: props.scaleMode || 'fit',
    blend: props.blend || {},

    src: props.src || '',
    viewportSize: props.viewportSize,
    liveAssetUpdateKey: frameIdx,

    keyPressAction,
  });
}
