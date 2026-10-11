// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Notifications } from '@salla.sa/twilight-theme-engine/routes/account';
import type { NotificationsPageProps } from '@salla.sa/twilight-theme-engine/routes/account';
import { CustomerPageSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Notifications route configuration.
 * Loads page data via loader and renders the Notifications component.
 */
export const Route = createFileRoute('/{-$locale}/account/notifications')({
  loader: ({ params }): Promise<NotificationsPageProps> =>
    Notifications.loader({ locale: params.locale }),
  head: withHead(Notifications),
  pendingComponent: () => <CustomerPageSkeleton />,
  component: NotificationsComponent,
});

/**
 * Notifications page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function NotificationsComponent() {
  const data: NotificationsPageProps = Route.useLoaderData();
  return <Notifications.Component {...data} />;
}
