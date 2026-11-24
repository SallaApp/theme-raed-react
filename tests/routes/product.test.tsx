/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
}));
vi.mock('@salla.sa/twilight-theme-engine/routes/product', () => ({
  Product: { loader: vi.fn() },
}));
vi.mock('@salla.sa/twilight-theme-engine/skeleton', () => ({
  ProductPendingPreview: () => <div data-testid="product-pending-preview" />,
  ProductDetailSkeleton: () => <div data-testid="product-detail-skeleton" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/tanstack', () => ({ withHead: () => () => ({}) }));
vi.mock('../../app/components/product/ProductPage', () => ({ ProductPage: () => null }));
vi.mock('../../app/lib/productNotFound', () => ({ redirectHomeIfNotFound: vi.fn() }));

describe('product route', () => {
  // Engine 1.0.189 (#676): while the product loads, show the tapped card's image, name and
  // price, not a blank skeleton. The theme owns this route, so it must opt in itself.
  it('shows the tapped card while the product loads', async () => {
    const { Route } = await import('../../app/routes/$slug.p$id');
    const Pending = (Route as unknown as { pendingComponent: ComponentType }).pendingComponent;

    const html = renderToString(<Pending />);

    expect(html).toContain('product-pending-preview');
    expect(html).not.toContain('product-detail-skeleton');
  });
});
