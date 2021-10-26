import * as React from 'react';

export function Image(props) {
  return (
    <image
      id={props.id} layout={props.layout} style={props.style || {}}
      src={props.src} />
  )
}
