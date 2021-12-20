import * as React from 'react';

export const MediaInputContext = React.createContext({

  // an array of booleans.
  // describes which video inputs are active.
  // depending on the application, these inputs may represent video call
  // participants, video files, or something else.
  // additional metadata will be provided elsewhere (e.g. participant names).
  activeVideoInputSlots: [],
});
