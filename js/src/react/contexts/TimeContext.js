import * as React from 'react';

export const PlaybackStateType = {
  PLAYING: 'playing',
  POSTROLL: 'postroll',
};

export const TimeContext = React.createContext({
  currentTime: 0,
  playbackState: PlaybackStateType.PLAYING,
});
