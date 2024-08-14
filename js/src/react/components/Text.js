import * as React from 'react';

export function Text(props) {
  // fontSize is mandatory, so add a default if not present
  let style = props.style || {};
  if (!style.fontSize_gu && !style.fontSize_px && !style.fontSize_vh) {
    style = {
      ...style,
      fontSize_gu: 1,
    };
  }

  const intrinsicProps = {
    id: props.id,
    layout: props.layout,
    style,
    transform: props.transform || {},
    clip: props.clip || false,
    blend: props.blend || {},
  };

  if (Array.isArray(props.children)) {
    // an array of spans.
    // these can be either plain strings or tuples containing a string and its style override, e.g.:
    //    ["Hello world", {textColor: 'yellow'}]
    intrinsicProps.spans = props.children.map((c) => {
      let string = '';
      let styleOverride = {};
      if (Array.isArray(c)) {
        const n = c.length;
        if (n > 0) string = '' + c[0];
        if (n > 1 && typeof c[1] === 'object') styleOverride = c[1];
      } else {
        string = '' + c;
      }
      return { string, style: styleOverride };
    });
  } else {
    // a single text string
    intrinsicProps.text = props.children || '';
  }

  // can't use JSX in VCS core because it needs to run on Node without transpiling
  return React.createElement('label', intrinsicProps);
}
