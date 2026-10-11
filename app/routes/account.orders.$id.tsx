// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { OrderSingle } from '@salla.sa/twilight-theme-engine/routes/account/orders';
import type { OrderSinglePageProps } from '@salla.sa/twilight-theme-engine/routes/account/orders';
import { CustomerPageSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * OrderSingle route configuration.
 * Loads page data via loader and renders the OrderSingle component.
 */
export const Route = createFileRoute('/{-$locale}/account/orders/$id')({
  loader: ({ params }): Promise<OrderSinglePageProps> =>
    OrderSingle.loader({ params: { id: params.id }, locale: params.locale }),
  head: withHead(OrderSingle),
  pendingComponent: () => <CustomerPageSkeleton />,
  component: OrderSingleComponent,
});

/**
 * OrderSingle page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function OrderSingleComponent() {
  const data: OrderSinglePageProps = Route.useLoaderData();
  return <OrderSingle.Component {...data} />;
}
