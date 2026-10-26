import { setupWorker } from 'msw/browser';
import { createHandlers } from './handlers';
import { scenarios, type ScenarioName } from './scenarios';

/**
 * Browser worker for Storybook and Playwright. Not used by vitest.
 * The worker script is generated into the app's public dir with `npx msw init public/ --save`
 * by whichever task wires Storybook or Playwright; it is not committed here.
 */
export const startMockWorker = (scenario: ScenarioName = 'default') =>
  setupWorker(...createHandlers(scenarios[scenario]())).start({ onUnhandledRequest: 'bypass' });
