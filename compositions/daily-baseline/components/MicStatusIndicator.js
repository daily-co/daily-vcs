import * as React from 'react';
import { Image } from '#vcs-react/components';
import * as layoutFuncs from '../layouts.js';

export function MicStatusIndicator({ audioPaused }) {
  const iconSrc = audioPaused
    ? 'mic_muted_white_32.png'
    : 'mic_active_white_32.png';

  return <Image src={iconSrc} layout={[layoutFuncs.micStatusIcon]} />;
}
