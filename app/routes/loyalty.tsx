// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Loyalty } from '@salla.sa/twilight-theme-engine/routes/loyalty';
import type { LoyaltyPageProps } from '@salla.sa/twilight-theme-engine/routes/loyalty';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Loyalty route configuration.
 * Loads page data via loader and renders the Loyalty component.
 */
export const Route = createFileRoute('/{-$locale}/loyalty')({
  loader: ({ params }): Promise<LoyaltyPageProps> => Loyalty.loader({ locale: params.locale }),
  head: withHead(Loyalty),
  component: LoyaltyComponent,
});

/**
 * Loyalty page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function LoyaltyComponent() {
  const data: LoyaltyPageProps = Route.useLoaderData();
  return <Loyalty.Component {...data} />;
}
