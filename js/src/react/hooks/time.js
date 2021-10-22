import * as React from 'react';
import { TimeContext } from '../contexts';

export function useVideoTime() {
  const ctx = React.useContext(TimeContext);
  return ctx.currentTime;
}
