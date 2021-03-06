import * as React from 'react';

export function Text(props) {
  const text = Array.isArray(props.children)
    ? props.children.join(' ')
    : props.children || '';

  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement('label', {
    id: props.id,
    layout: props.layout,
    style: props.style || {},
    transform: props.transform || {},
    clip: props.clip || false,
    blend: props.blend || {},
    text: text,
  });
}
