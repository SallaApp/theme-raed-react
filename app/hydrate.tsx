import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start/client';
import { initThemeSentry } from '@salla.sa/twilight-theme-engine/sentry/client';
import { removeEdgeInjections } from '@salla.sa/twilight-theme-engine/dom';

initThemeSentry('raed');

export function hydrate(): void {
  removeEdgeInjections();

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>
    );
  });
}
