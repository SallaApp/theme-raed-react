// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { ThankYou } from '@salla.sa/twilight-theme-engine/routes/thank-you';
import type { ThankYouPageProps } from '@salla.sa/twilight-theme-engine/routes/thank-you';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * ThankYou route configuration.
 * Loads page data via loader and renders the ThankYou component.
 */
export const Route = createFileRoute('/{-$locale}/thankyou/$orderId')({
  loader: ({ params }): Promise<ThankYouPageProps> =>
    ThankYou.loader({ params: { orderId: params.orderId }, locale: params.locale }),
  head: withHead(ThankYou),
  component: ThankYouComponent,
});

/**
 * ThankYou page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function ThankYouComponent() {
  const data: ThankYouPageProps = Route.useLoaderData();
  return <ThankYou.Component {...data} />;
}
