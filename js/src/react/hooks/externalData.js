import * as React from 'react';
import { ExternalDataContext } from '../contexts';

export function useParams() {
  const ctx = React.useContext(ExternalDataContext);
  return ctx.params;
}
