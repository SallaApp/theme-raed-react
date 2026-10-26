/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { renderToString, renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import type { ThemeStylesheetProps } from '@salla.sa/twilight-theme-engine/tanstack';
import { HOME_ROUTE_ID, PRODUCT_ROUTE_ID } from '../../app/lib/routeIds';

const rendered = vi.hoisted(() => ({ stylesheet: null as ThemeStylesheetProps | null }));

vi.mock('@tanstack/react-router', () => ({
  Scripts: () => null,
  Outlet: () => null,
}));
vi.mock('@tanstack/react-router-devtools', () => ({ TanStackRouterDevtools: () => null }));
vi.mock('@salla.sa/twilight-theme-engine', () => ({
  TwilightProvider: ({ children }: { children?: unknown }) => children,
}));
vi.mock('@salla.sa/twilight-theme-engine/tanstack', () => ({
  createTwilightRootRoute: () => (options: unknown) => options,
  getTwilightContext: () => ({ locale: 'ar', dir: 'rtl' }),
  ThemeStylesheet: (props: ThemeStylesheetProps) => {
    rendered.stylesheet = props;
    return null;
  },
  ThemeHeadContent: () => null,
}));
vi.mock('@salla.sa/twilight-theme-engine/dev', () => ({
  DevSettingsWidget: () => 'dev-settings-widget',
}));
vi.mock('virtual:twilight/theme-translations', () => ({ default: {} }));
vi.mock('virtual:twilight/schema', () => ({ default: {} }));
vi.mock('../../app/components/layout/ThemeLayout', () => ({ ThemeLayout: () => null }));
vi.mock('../../app/styles/app.css?url', () => ({ default: '/app.css' }));
vi.mock('../../app/styles/critical.scss?inline', () => ({ default: '.home{color:red}' }));
vi.mock('../../app/styles/critical-product.scss?inline', () => ({ default: '.pdp{color:blue}' }));

describe('root head', () => {
  it('paints the home and product pages from their own critical CSS', async () => {
    const { Route } = await import('../../app/routes/__root');
    const Shell = (Route as unknown as { shellComponent: ComponentType }).shellComponent;

    renderToString(<Shell />);

    expect(rendered.stylesheet?.href).toBe('/app.css');
    expect(rendered.stylesheet?.critical).toEqual({
      [HOME_ROUTE_ID]: '.home{color:red}',
      [PRODUCT_ROUTE_ID]: '.pdp{color:blue}',
    });
  });

  it('offers the live settings editor in development', async () => {
    const { Route } = await import('../../app/routes/__root');
    const Shell = (Route as unknown as { shellComponent: ComponentType }).shellComponent;

    let html = '';
    const sink = new Writable({
      write(chunk, _enc, done) {
        html += chunk.toString();
        done();
      },
    });
    await new Promise<void>((resolve) => {
      const stream = renderToPipeableStream(<Shell />, {
        onAllReady: () => {
          stream.pipe(sink);
          sink.on('finish', resolve);
        },
      });
    });

    expect(html).toContain('dev-settings-widget');
  });

  it('ships no critical CSS or settings editor in the client production bundle', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('SSR', false);
    vi.resetModules();
    try {
      const { Route } = await import('../../app/routes/__root');
      const Shell = (Route as unknown as { shellComponent: ComponentType }).shellComponent;

      const html = renderToString(<Shell />);

      expect(rendered.stylesheet?.critical).toEqual({
        [HOME_ROUTE_ID]: '',
        [PRODUCT_ROUTE_ID]: '',
      });
      expect(html).not.toContain('dev-settings-widget');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
