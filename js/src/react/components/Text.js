import * as React from 'react';

export function Text(props) {
  const text = Array.isArray(props.children)
    ? props.children.join(' ')
    : props.children || '';

  // fontSize is mandatory, so add a default if not present
  let style = props.style || {};
  if (!style.fontSize_gu && !style.fontSize_px && !style.fontSize_vh) {
    style = {
      ...style,
      fontSize_gu: 1,
    };
  }

  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement('label', {
    id: props.id,
    layout: props.layout,
    style,
    transform: props.transform || {},
    clip: props.clip || false,
    blend: props.blend || {},
    text,
  });
}
