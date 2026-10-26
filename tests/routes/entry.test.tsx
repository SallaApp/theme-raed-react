import { describe, it, expect, vi, beforeEach } from 'vitest';

const e = vi.hoisted(() => ({
  hydrateRoot: vi.fn(),
  removeEdgeInjections: vi.fn(),
  initThemeSentry: vi.fn(),
  bootClient: vi.fn(),
  createStart: vi.fn((factory: () => unknown) => factory()),
  twilightMiddleware: vi.fn(() => 'twilight'),
  earlyHintsMiddleware: vi.fn(() => 'early-hints'),
  withThemeSentry: vi.fn((handler: unknown, name: string) => ({ handler, name })),
}));

vi.mock('react-dom/client', () => ({ hydrateRoot: e.hydrateRoot }));
vi.mock('@tanstack/react-start/client', () => ({ StartClient: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/sentry/client', () => ({
  initThemeSentry: e.initThemeSentry,
}));
vi.mock('@salla.sa/twilight-theme-engine/dom', () => ({
  removeEdgeInjections: e.removeEdgeInjections,
}));
vi.mock('@salla.sa/twilight-theme-engine/boot', () => ({ bootClient: e.bootClient }));
vi.mock('@salla.sa/twilight-theme-engine/sentry/server', () => ({
  withThemeSentry: e.withThemeSentry,
}));
vi.mock('@tanstack/react-start/server-entry', () => ({ default: 'server-handler' }));
vi.mock('@tanstack/react-start', () => ({ createStart: e.createStart }));
vi.mock('@salla.sa/twilight-theme-engine/tanstack', () => ({
  twilightMiddleware: e.twilightMiddleware,
  earlyHintsMiddleware: e.earlyHintsMiddleware,
}));
vi.mock('../../app/hydrate', () => ({ hydrate: 'hydrate-fn' }));
vi.mock('../../app/styles/app.css?url', () => ({ default: '/app.css' }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('client entry', () => {
  it('boots the client with the app stylesheet and the lazily loaded hydrator', async () => {
    await import('../../app/client');
    const options = e.bootClient.mock.calls[0][0];
    expect(options.stylesheet).toBe('/app.css');
    expect((await options.load()).hydrate).toBe('hydrate-fn');
  });
});

describe('hydrate', () => {
  it('reports errors to the theme Sentry project', async () => {
    await vi.importActual('../../app/hydrate');
    expect(e.initThemeSentry).toHaveBeenCalledWith('raed');
  });

  it('strips edge-injected nodes, then hydrates the whole document', async () => {
    const { hydrate } =
      await vi.importActual<typeof import('../../app/hydrate')>('../../app/hydrate');
    hydrate();
    expect(e.removeEdgeInjections).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(e.hydrateRoot).toHaveBeenCalledTimes(1));
    expect(e.hydrateRoot.mock.calls[0][0]).toBe(document);
  });
});

describe('start and server entries', () => {
  it('runs the twilight and early-hints middleware on every request', async () => {
    const { startInstance } = await import('../../app/start');
    expect(startInstance).toEqual({ requestMiddleware: ['twilight', 'early-hints'] });
  });

  it('wraps the server handler with theme Sentry', async () => {
    const mod = await import('../../app/server');
    expect(mod.default).toEqual({ handler: 'server-handler', name: 'raed' });
  });
});

describe('routes manifest', () => {
  it('declares no custom routes', async () => {
    const { routes } = await import('../../app/routes');
    expect(routes).toEqual([]);
  });
});
