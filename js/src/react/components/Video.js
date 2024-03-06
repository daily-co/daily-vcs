import * as React from 'react';

export function Video(props) {
  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement('video', {
    id: props.id,
    layout: props.layout,
    style: props.style || {},
    src: props.src,
    scaleMode: props.scaleMode || 'fill',
    blend: props.blend || {},
    zoom: Number.isFinite(props.zoom) && props.zoom > 0 ? props.zoom : 1,
  });
}
