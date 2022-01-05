import * as React from 'react';

export const MediaInputContext = React.createContext({
  // the output viewport.
  // doesn't change during a rendering session.
  viewportSize: {
    w: 0,
    h: 0,
  },

  // an array of booleans.
  // describes which video inputs are active.
  // depending on the application, these inputs may represent video call
  // participants, video files, or something else.
  // additional metadata will be provided elsewhere (e.g. participant names).
  activeVideoInputSlots: [],
});
