import { setupServer } from 'msw/node';
import { createHandlers } from './handlers';
import { defaultScenario, scenarios, type MockData, type ScenarioName } from './scenarios';

/** Node (vitest, jsdom) server. Opt in per test file: `installMockServer()` in the file's top level. */
export const server = setupServer(...createHandlers());

/** Swap in a scenario (or your own data) for the rest of the current test. */
export const useScenario = (scenario: ScenarioName | MockData = 'default') => {
  const data = typeof scenario === 'string' ? scenarios[scenario]() : scenario;
  server.resetHandlers(...createHandlers(data));
  return data;
};

/**
 * Start the server before the file's tests and stop it after; reset per test.
 * `onUnhandledRequest: 'error'` fails a test that asks for a path no handler knows.
 */
export const installMockServer = (
  hooks: { beforeAll: typeof beforeAll; afterEach: typeof afterEach; afterAll: typeof afterAll } = {
    beforeAll,
    afterEach,
    afterAll,
  }
) => {
  hooks.beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  hooks.afterEach(() => server.resetHandlers(...createHandlers(defaultScenario())));
  hooks.afterAll(() => server.close());
};
