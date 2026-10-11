// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { BlogTagRoute } from '@salla.sa/twilight-theme-engine/routes/blog';
import type { BlogTagLoaderData } from '@salla.sa/twilight-theme-engine/routes/blog';
import { BlogSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * BlogTagRoute route configuration.
 * Loads page data via loader and renders the BlogTagRoute component.
 */
export const Route = createFileRoute('/{-$locale}/blog/$slug/tag-{$id}')({
  loader: ({ params }): Promise<BlogTagLoaderData> =>
    BlogTagRoute.loader({ params: { slug: params.slug, id: params.id }, locale: params.locale }),
  head: withHead(BlogTagRoute),
  pendingComponent: () => <BlogSkeleton />,
  component: BlogTagRouteComponent,
});

/**
 * BlogTagRoute page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function BlogTagRouteComponent() {
  const data: BlogTagLoaderData = Route.useLoaderData();
  return <BlogTagRoute.Component {...data} />;
}
