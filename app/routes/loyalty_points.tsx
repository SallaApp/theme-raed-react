// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { LoyaltyPoints } from '@salla.sa/twilight-theme-engine/routes/loyalty';
import type { LoyaltyPointsPageProps } from '@salla.sa/twilight-theme-engine/routes/loyalty';
import { CustomerLayoutSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * LoyaltyPoints route configuration.
 * Loads page data via loader and renders the LoyaltyPoints component.
 */
export const Route = createFileRoute('/{-$locale}/loyalty_points')({
  loader: ({ params }): Promise<LoyaltyPointsPageProps> =>
    LoyaltyPoints.loader({ locale: params.locale }),
  head: withHead(LoyaltyPoints),
  pendingComponent: () => <CustomerLayoutSkeleton />,
  component: LoyaltyPointsComponent,
});

/**
 * LoyaltyPoints page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function LoyaltyPointsComponent() {
  const data: LoyaltyPointsPageProps = Route.useLoaderData();
  return <LoyaltyPoints.Component {...data} />;
}
