import * as React from 'react';

export function Image(props) {
  return (
    <image
      id={props.id}
      layout={props.layout}
      style={props.style || {}}
      transform={props.transform || {}}
      src={props.src} />
  )
}
