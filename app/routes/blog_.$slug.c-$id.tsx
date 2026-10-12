// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { BlogCategoryRoute } from '@salla.sa/twilight-theme-engine/routes/blog';
import type { BlogCategoryLoaderData } from '@salla.sa/twilight-theme-engine/routes/blog';
import { BlogSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * BlogCategoryRoute route configuration.
 * Loads page data via loader and renders the BlogCategoryRoute component.
 */
export const Route = createFileRoute('/{-$locale}/blog/$slug/c-{$id}')({
  loader: ({ params }): Promise<BlogCategoryLoaderData> =>
    BlogCategoryRoute.loader({ params: { slug: params.slug, id: params.id }, locale: params.locale }),
  head: withHead(BlogCategoryRoute),
  pendingComponent: () => <BlogSkeleton />,
  component: BlogCategoryRouteComponent,
});

/**
 * BlogCategoryRoute page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function BlogCategoryRouteComponent() {
  const data: BlogCategoryLoaderData = Route.useLoaderData();
  return <BlogCategoryRoute.Component {...data} />;
}
