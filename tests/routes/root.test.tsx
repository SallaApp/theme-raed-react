/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
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
});
