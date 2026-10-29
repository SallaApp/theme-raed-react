import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Advertisement } from '@salla.sa/twilight-theme-engine/api/advertisement';
import { PageAdvertisements } from '../../../app/components/layout/PageAdvertisements';

const state = { pageSlug: 'product.single' as string | undefined };

const ADS: Advertisement[] = [
  { id: 1, description: 'Every page', pages: ['all'] },
  { id: 2, description: 'Home and cart', pages: ['index', 'cart'] },
];

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ matches: [{ loaderData: {} }, { loaderData: { page: { slug: state.pageSlug } } }] }),
}));
vi.mock('@salla.sa/twilight-theme-engine/api/advertisement', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@salla.sa/twilight-theme-engine/api/advertisement')>();
  return {
    ...original,
    advertisement: {
      queries: { list: () => ({ queryKey: ['advertisements'], queryFn: async () => ADS }) },
    },
  };
});
vi.mock('@salla.sa/twilight-theme-engine/utils', () => ({ whenSallaReady: () => () => {} }));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderAds() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PageAdvertisements />
    </QueryClientProvider>
  );
}

/** Pretends the page is the theme editor's preview iframe. */
function inPreview() {
  vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
}

describe('PageAdvertisements', () => {
  beforeEach(() => {
    state.pageSlug = 'product.single';
    window.localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows only the ads set for the current page', async () => {
    renderAds();
    await screen.findByText('Every page');
    expect(screen.queryByText('Home and cart')).toBeNull();
  });

  it("keeps the merchant's page choice in the theme editor preview", async () => {
    inPreview();
    renderAds();
    await screen.findByText('Every page');
    expect(screen.queryByText('Home and cart')).toBeNull();
  });

  it('shows a closed ad again in the preview', async () => {
    window.localStorage.setItem('statusAd-1', JSON.stringify('dismissed'));
    inPreview();
    renderAds();
    expect(await screen.findByText('Every page')).toBeTruthy();
  });

  it('hides a closed ad on the storefront', async () => {
    window.localStorage.setItem('statusAd-1', JSON.stringify('dismissed'));
    state.pageSlug = 'cart';
    renderAds();
    await screen.findByText('Home and cart');
    await waitFor(() => expect(screen.queryByText('Every page')).toBeNull());
  });
});
