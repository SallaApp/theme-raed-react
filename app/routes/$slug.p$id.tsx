import { createFileRoute } from '@tanstack/react-router';
import { Product } from '@salla.sa/twilight-theme-engine/routes/product';
import type { ProductPageProps } from '@salla.sa/twilight-theme-engine/routes/product';
import { ProductDetailSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';
import { ProductPage } from '../components/product/ProductPage';
import { redirectHomeIfNotFound } from '../lib/productNotFound';

export const Route = createFileRoute('/{-$locale}/$slug/p{$id}')({
  loader: async ({ params, preload }): Promise<ProductPageProps> => {
    // Keep the product's own category trail instead of the page the visitor came from.
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem('breadcrumb-referrer');
      }
    } catch {
      /* private mode */
    }
    try {
      return await Product.loader({ params: { id: params.id }, locale: params.locale });
    } catch (error) {
      // Hidden or deleted product: home page with a "Page not found" toast, not the 404 page.
      return redirectHomeIfNotFound(error, { locale: params.locale, preload });
    }
  },
  head: withHead(Product),
  pendingComponent: () => <ProductDetailSkeleton />,
  component: ProductComponent,
});

function ProductComponent() {
  const data: ProductPageProps = Route.useLoaderData();
  // Remount for each product so the previous product's state resets.
  return <ProductPage key={data.product.id} {...data} />;
}
