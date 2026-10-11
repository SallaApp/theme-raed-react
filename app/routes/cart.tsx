import { createFileRoute } from '@tanstack/react-router';
import { Cart } from '@salla.sa/twilight-theme-engine/routes/cart';
import type { CartPageProps } from '@salla.sa/twilight-theme-engine/routes/cart';
import { CartSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';
import { CartPage } from '../components/cart/CartPage';

export const Route = createFileRoute('/{-$locale}/cart')({
  loader: ({ params }): Promise<CartPageProps> => Cart.loader({ locale: params.locale }),
  head: withHead(Cart),
  pendingComponent: () => <CartSkeleton />,
  component: CartComponent,
});

function CartComponent() {
  const data: CartPageProps = Route.useLoaderData();
  return <CartPage {...data} />;
}
