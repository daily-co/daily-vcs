import * as React from 'react';

export function Image(props) {
  let { src } = props;

  if (typeof src === 'string' && src.indexOf('.') === -1) {
    // add default file extension
    src += '.png';
  }

  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement('image', {
    id: props.id,
    layout: props.layout,
    style: props.style || {},
    transform: props.transform || {},
    src,
    scaleMode: props.scaleMode || 'fit',
    blend: props.blend || {},
  });
}
