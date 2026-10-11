// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Profile } from '@salla.sa/twilight-theme-engine/routes/account';
import type { ProfilePageProps } from '@salla.sa/twilight-theme-engine/routes/account';
import { CustomerPageSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Profile route configuration.
 * Loads page data via loader and renders the Profile component.
 */
export const Route = createFileRoute('/{-$locale}/account/profile')({
  loader: ({ params }): Promise<ProfilePageProps> => Profile.loader({ locale: params.locale }),
  head: withHead(Profile),
  pendingComponent: () => <CustomerPageSkeleton />,
  component: ProfileComponent,
});

/**
 * Profile page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function ProfileComponent() {
  const data: ProfilePageProps = Route.useLoaderData();
  return <Profile.Component {...data} />;
}
