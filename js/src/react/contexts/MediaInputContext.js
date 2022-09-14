import * as React from 'react';

export const MediaInputContext = React.createContext({
  // the output viewport.
  // doesn't change during a rendering session.
  viewportSize: {
    w: 0,
    h: 0,
  },

  // size of the grid unit.
  // will be set when composition is inited (by default based on viewport size).
  pixelsPerGridUnit: 20,

  // an array of truthy or falsy objects.
  // describes which video inputs are active.
  // depending on the application, these inputs may represent video call
  // participants, video files, or something else.
  // the array is expected to be filled out to match the maximum number of inputs
  // available on the host application. (e.g. if host supports 16 inputs but
  // none of them is connected, this array would contain 16 null/false values.)
  // NOTE: additional metadata may be provided by passing an object value for a slot.
  // in this case each non-null input is expected to provide at least an 'id' property.
  // (see hooks/mediaInput.js for a helper that reads this metadata.)
  // the reason for allowing non-object values here is to make the simple case
  // very simple: if a slot doesn't have the 'id' property, the video input ids
  // are assumed to be simply indexes into this slot array. this is useful for
  // offline compositing applications with a fixed set of inputs (e.g. test runners).
  activeVideoInputSlots: [],
});
