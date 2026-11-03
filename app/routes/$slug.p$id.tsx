import { createFileRoute } from '@tanstack/react-router';
import { Product } from '@salla.sa/twilight-theme-engine/routes/product';
import { ProductDetailSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';
import { ProductPage, type ProductRouteData } from '../components/product/ProductPage';
import { ProductSwitchProvider, useSwitchableProduct } from '../components/product/ProductSwitch';
import { loadStaticVariants } from '../lib/staticVariants';

export const Route = createFileRoute('/{-$locale}/$slug/p{$id}')({
  loader: async ({ params }): Promise<ProductRouteData> => {
    // Keep the product's own category trail instead of the page the visitor came from.
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem('breadcrumb-referrer');
      }
    } catch {
      /* private mode */
    }
    const [data, staticVariants] = await Promise.all([
      Product.loader({ params: { id: params.id }, locale: params.locale }),
      // Option buttons from the store's static data, when it lists this product.
      loadStaticVariants(params.id).catch(() => null),
    ]);
    return { ...data, staticVariants };
  },
  head: withHead(Product),
  pendingComponent: () => <ProductDetailSkeleton />,
  component: ProductComponent,
});

function ProductComponent() {
  const loaded: ProductRouteData = Route.useLoaderData();
  const { locale } = Route.useParams();
  // Option buttons swap the product in place (ProductSwitch.tsx) instead of navigating.
  const { shown, productSwitch } = useSwitchableProduct(loaded, locale);
  // Remount for each product so the previous product's state resets.
  return (
    <ProductSwitchProvider value={productSwitch}>
      <ProductPage key={shown.product.id} {...shown} />
    </ProductSwitchProvider>
  );
}
