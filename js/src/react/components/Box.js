import * as React from 'react';

export function Box(props) {
  return (
    <box id={props.id} layout={props.layout}>
      {props.children}
    </box>
  )
}
