import * as React from 'react';

// the shape of the Peer object described as vanilla JS
export function makeEmptyPeer() {
  return {
    id: '',
    displayName: null,
    video: {
      id: null, // if non-null, can be mapped to MediaInputContext.activeVideoInputSlots
      paused: false,
    },
    screenshareVideo: {
      id: null,
      paused: false,
    },
    audio: {
      id: null,
      paused: false,
    },
  };
}

export const RenderingEnvironmentType = {
  UNKNOWN: '',
  OFFLINE: 'offline',
  MEDIA_SERVER: 'media-server',
  PARTICIPANT_CLIENT: 'participant-client',
  PASSIVE_VIEWER_CLIENT: 'passive-viewer-client',
};

export const RoomContext = React.createContext({
  // our role within this room (e.g. "media server").
  renderingEnvironment: RenderingEnvironmentType.UNKNOWN,

  // a list of Peer objects.
  // this may not be an exhaustive list of participants on a video call.
  // "available" simply means that these peers are known to the host app.
  // they probably have video and/or audio tracks, but both might be paused.
  // the ordering is also unspecified (host-dependent).
  // we can't give any more specific guarantees (at least for now) because VCS
  // doesn't have control over the peer selection logic used by the host app.
  availablePeers: [],
});
