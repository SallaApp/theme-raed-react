// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '@salla.sa/twilight-theme-engine/routes/account';
import type { SettingsPageProps } from '@salla.sa/twilight-theme-engine/routes/account';
import { CustomerPageSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Settings route configuration.
 * Loads page data via loader and renders the Settings component.
 */
export const Route = createFileRoute('/{-$locale}/account/settings')({
  loader: ({ params }): Promise<SettingsPageProps> => Settings.loader({ locale: params.locale }),
  head: withHead(Settings),
  pendingComponent: () => <CustomerPageSkeleton />,
  component: SettingsComponent,
});

/**
 * Settings page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function SettingsComponent() {
  const data: SettingsPageProps = Route.useLoaderData();
  return <Settings.Component {...data} />;
}
