// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Orders } from '@salla.sa/twilight-theme-engine/routes/account/orders';
import type { OrdersPageProps } from '@salla.sa/twilight-theme-engine/routes/account/orders';
import { CustomerPageSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Orders route configuration.
 * Loads page data via loader and renders the Orders component.
 */
export const Route = createFileRoute('/{-$locale}/account/orders')({
  validateSearch: (search: Record<string, unknown>) => {
    const status = (search.status as string) || undefined;
    return status ? { status } : {};
  },
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ deps, params }): Promise<OrdersPageProps> =>
    Orders.loader({ search: { status: deps.status }, locale: params.locale }),
  head: withHead(Orders),
  pendingComponent: () => <CustomerPageSkeleton />,
  component: OrdersComponent,
});

/**
 * Orders page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function OrdersComponent() {
  const data: OrdersPageProps = Route.useLoaderData();
  return <Orders.Component {...data} />;
}
