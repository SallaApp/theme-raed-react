// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Wishlist } from '@salla.sa/twilight-theme-engine/routes/account';
import type { WishlistPageProps } from '@salla.sa/twilight-theme-engine/routes/account';
import { CustomerPageSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Wishlist route configuration.
 * Loads page data via loader and renders the Wishlist component.
 */
export const Route = createFileRoute('/{-$locale}/account/wishlist')({
  validateSearch: (search: Record<string, unknown>) => {
    const page = Number(search.page) || 1;
    return page > 1 ? { page } : {};
  },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps, params }): Promise<WishlistPageProps> =>
    Wishlist.loader({ search: { page: deps.page ?? 1 }, locale: params.locale }),
  head: withHead(Wishlist),
  pendingComponent: () => <CustomerPageSkeleton />,
  component: WishlistComponent,
});

/**
 * Wishlist page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function WishlistComponent() {
  const data: WishlistPageProps = Route.useLoaderData();
  return <Wishlist.Component {...data} />;
}
