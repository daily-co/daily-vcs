import * as React from 'react';
import { CompositionDataContext } from '../contexts';

export function useMode() {
  const ctx = React.useContext(CompositionDataContext);
  return ctx.mode;
}

export function useParams() {
  const ctx = React.useContext(CompositionDataContext);
  return ctx.params;
}
