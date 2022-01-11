import * as React from 'react';

export function Video(props) {
  return (
    <video
      id={props.id}
      layout={props.layout}
      style={props.style || {}}
      src={props.src}
      scaleMode={props.scaleMode || 'fill'}
    />
  );
}
