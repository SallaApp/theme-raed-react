// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Wallet } from '@salla.sa/twilight-theme-engine/routes/account';
import type { WalletPageProps } from '@salla.sa/twilight-theme-engine/routes/account';
import { CustomerPageSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Wallet route configuration.
 * Loads page data via loader and renders the Wallet component.
 */
export const Route = createFileRoute('/{-$locale}/account/wallet')({
  validateSearch: (search: Record<string, unknown>) => {
    const page = Number(search.page) || 1;
    return page > 1 ? { page } : {};
  },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }): Promise<WalletPageProps> =>
    Wallet.loader({ search: { page: deps.page ?? 1 } }),
  head: withHead(Wallet),
  pendingComponent: () => <CustomerPageSkeleton />,
  component: WalletComponent,
});

/**
 * Wallet page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function WalletComponent() {
  const data: WalletPageProps = Route.useLoaderData();
  return <Wallet.Component {...data} />;
}
