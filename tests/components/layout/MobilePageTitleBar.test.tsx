import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MobilePageTitleBar } from '../../../app/components/layout/MobilePageTitleBar';

const state = {
  routeIds: [] as string[],
  title: 'Cart' as string | undefined,
};

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (s: { matches: { routeId: string; loaderData?: unknown }[] }) => unknown;
  }) =>
    select({
      matches: state.routeIds.map((routeId) => ({
        routeId,
        loaderData: { page: { title: state.title } },
      })),
    }),
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

beforeEach(() => {
  state.routeIds = [];
  state.title = 'Cart';
});

describe('MobilePageTitleBar', () => {
  it('renders the route page title on an inner page', () => {
    state.routeIds = ['/{-$locale}/cart'];
    const { container } = render(<MobilePageTitleBar />);
    expect(container.querySelector('.mobile-page-title__text')?.textContent).toBe('Cart');
  });

  it('renders nothing on the home page, decided from route match state (SSR-safe)', () => {
    state.routeIds = ['/{-$locale}/'];
    state.title = 'Home';
    const { container } = render(<MobilePageTitleBar />);
    expect(container.querySelector('.mobile-page-title')).toBeNull();
  });

  it('renders nothing on the product page', () => {
    state.routeIds = ['/{-$locale}/$slug/p{$id}'];
    const { container } = render(<MobilePageTitleBar />);
    expect(container.querySelector('.mobile-page-title')).toBeNull();
  });
});
