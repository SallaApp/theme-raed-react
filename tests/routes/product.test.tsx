/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import {
  ProductDetailSkeleton,
  ProductPendingPreview,
} from '@salla.sa/twilight-theme-engine/skeleton';

// The engine's skeleton module imports skeletons from here; use the real package, not the
// setup stub, so the test checks the engine's own `ProductPendingPreview`.
vi.mock('@salla.sa/twilight-components-react', async (importOriginal) => importOriginal());
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
}));
vi.mock('@salla.sa/twilight-theme-engine/routes/product', () => ({
  Product: { loader: vi.fn() },
}));
vi.mock('@salla.sa/twilight-theme-engine/tanstack', () => ({ withHead: () => () => ({}) }));
vi.mock('../../app/components/product/ProductPage', () => ({ ProductPage: () => null }));
vi.mock('../../app/lib/productNotFound', () => ({ redirectHomeIfNotFound: vi.fn() }));

describe('product route', () => {
  // Engine 1.0.189 (#676): while the product loads, show the tapped card's image, name and
  // price, not a blank skeleton. The theme owns this route, so it must opt in itself.
  it('shows the tapped card while the product loads', async () => {
    const { Route } = await import('../../app/routes/$slug.p$id');
    const pending = (Route as unknown as { pendingComponent: () => ReactElement })
      .pendingComponent;

    // The real engine export, not a stub: this fails if the installed engine lacks it.
    expect(typeof ProductPendingPreview).toBe('function');
    const element = pending();
    expect(element.type).toBe(ProductPendingPreview);
    expect(element.type).not.toBe(ProductDetailSkeleton);
  });
});
