import { createFileRoute } from '@tanstack/react-router';
import { Product } from '@salla.sa/twilight-theme-engine/routes/product';
import type { ProductPageProps } from '@salla.sa/twilight-theme-engine/routes/product';
import { ProductDetailSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';
import { ProductPage } from '../components/product/ProductPage';

export const Route = createFileRoute('/{-$locale}/$slug/p{$id}')({
  loader: ({ params }): Promise<ProductPageProps> => {
    // Keep the product's own category trail instead of the page the visitor came from.
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem('breadcrumb-referrer');
      }
    } catch {
      /* private mode */
    }
    return Product.loader({ params: { id: params.id }, locale: params.locale });
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
