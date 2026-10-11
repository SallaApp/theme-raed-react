// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { BlogAuthorRoute } from '@salla.sa/twilight-theme-engine/routes/blog';
import type { BlogAuthorLoaderData } from '@salla.sa/twilight-theme-engine/routes/blog';
import { BlogSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * BlogAuthorRoute route configuration.
 * Loads page data via loader and renders the BlogAuthorRoute component.
 */
export const Route = createFileRoute('/{-$locale}/blog/author/$id')({
  loader: ({ params }): Promise<BlogAuthorLoaderData> =>
    BlogAuthorRoute.loader({ params: { id: params.id }, locale: params.locale }),
  head: withHead(BlogAuthorRoute),
  pendingComponent: () => <BlogSkeleton />,
  component: BlogAuthorRouteComponent,
});

/**
 * BlogAuthorRoute page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function BlogAuthorRouteComponent() {
  const data: BlogAuthorLoaderData = Route.useLoaderData();
  return <BlogAuthorRoute.Component {...data} />;
}
