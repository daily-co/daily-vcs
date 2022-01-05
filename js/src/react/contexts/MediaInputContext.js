import * as React from 'react';

export const MediaInputContext = React.createContext({
  // the output viewport.
  // doesn't change during a rendering session.
  viewportSize: {
    w: 0,
    h: 0,
  },

  // an array of truthy or falsy objects.
  // describes which video inputs are active.
  // depending on the application, these inputs may represent video call
  // participants, video files, or something else.
  // the array is expected to be filled out to match the maximum number of inputs
  // available on the host application. (e.g. if host supports 16 inputs but
  // none of them is connected, this array would contain 16 null/false values.)
  // additional metadata may be provided by passing an object value for a slot.
  activeVideoInputSlots: [],
});
