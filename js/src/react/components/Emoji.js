import * as React from 'react';

export function Emoji(props) {
  const { value = '' } = props;

  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement('emoji', {
    id: props.id,
    layout: props.layout,
    style: props.style || {},
    transform: props.transform || {},
    blend: props.blend || {},
    value,
  });
}
