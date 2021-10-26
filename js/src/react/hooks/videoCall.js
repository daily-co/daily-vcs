import * as React from 'react';
import { VideoCallContext } from '../contexts';

export function useVideoCall() {
  return React.useContext(VideoCallContext);
}
