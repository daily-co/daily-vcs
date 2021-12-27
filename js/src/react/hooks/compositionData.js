import * as React from 'react';
import { CompositionDataContext } from '../contexts';

export function useParams() {
  const ctx = React.useContext(CompositionDataContext);
  return ctx.params;
}
