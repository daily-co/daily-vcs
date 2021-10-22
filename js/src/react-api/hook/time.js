import * as React from 'react';
import { TimeContext } from '../context';

export function useVideoTime() {
  const ctx = React.useContext(TimeContext);
  console.log("ctx: ", ctx)
  return ctx.currentTime;
}
