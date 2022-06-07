import * as React from 'react';
import {
  TimeContext,
  PlaybackStateType as PlaybackStateType_,
} from '../contexts/index.js';

export function useVideoTime() {
  const ctx = React.useContext(TimeContext);
  return ctx.currentTime;
}

export function useVideoPlaybackState() {
  const ctx = React.useContext(TimeContext);
  return ctx.playbackState;
}

export const PlaybackStateType = PlaybackStateType_;
