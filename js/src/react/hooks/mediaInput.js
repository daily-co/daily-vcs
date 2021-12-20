import * as React from 'react';
import { MediaInputContext } from '../contexts';

export function useMediaInput() {
  return React.useContext(MediaInputContext);
}
