import * as React from 'react';

// the shape of a standard message object described as vanilla JS
export function makeEmptyMessage() {
  return {
    key: '', // a unique id
    senderDisplayName: '',
    text: '',
    date: null, // a Date object
  };
}

export function makeEmptyStandardSources() {
  return {
    chatMessages: {
      enabled: false,
      latest: [], // items are shape of makeEmptyMessage
    },
    transcript: {
      enabled: false,
      latest: [], // items are shape of makeEmptyMessage
    },
    emojiReactions: {
      enabled: false,
      latest: [], // items are shape of makeEmptyMessage
    },
  };
}

export const CompositionDataContext = React.createContext({
  // current values of params declared by the composition
  params: {},
  //
  // standard sources are known data types that a host can send to a VCS composition.
  //
  // to receive data from a standard source, the host must be able to send that data,
  // and the composition must declare that it accepts that data.
  // if both conditions are met, the `enabled` flag for a source description in
  // `standardSources` will be set.
  //
  // when `enabled` is true, `latest` will contain the latest objects of that type
  // received since the previous render iteration.
  // the host guarantees that there's always a unique `key` for each object in `latest`
  // so that VCS compositions can use key comparison to check for updates.
  standardSources: makeEmptyStandardSources(),
});
