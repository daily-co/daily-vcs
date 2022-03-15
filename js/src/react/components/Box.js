import * as React from 'react';

export function Box(props) {
  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement(
    'box',
    {
      id: props.id,
      layout: props.layout,
      style: props.style || {},
      transform: props.transform || {},
      clip: props.clip || false,
    },
    props.children
  );
}
