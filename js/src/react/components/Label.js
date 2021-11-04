import * as React from 'react';

export function Label(props) {
  const text = (Array.isArray(props.children))
        ? props.children.join(' ')
        : props.children || '';

  return (
    <label
      id={props.id}
      layout={props.layout}
      style={props.style || {}}
      transform={props.transform || {}}
      text={text}
    />
  )
}
