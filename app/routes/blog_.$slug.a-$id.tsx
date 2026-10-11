// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { BlogSingle } from '@salla.sa/twilight-theme-engine/routes/blog';
import type { BlogSinglePageProps } from '@salla.sa/twilight-theme-engine/routes/blog';
import { BlogSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * BlogSingle route configuration.
 * Loads page data via loader and renders the BlogSingle component.
 */
export const Route = createFileRoute('/{-$locale}/blog/$slug/a-{$id}')({
  loader: ({ params }): Promise<BlogSinglePageProps> =>
    BlogSingle.loader({ params: { slug: params.slug, id: params.id }, locale: params.locale }),
  head: withHead(BlogSingle),
  pendingComponent: () => <BlogSkeleton />,
  component: BlogSingleComponent,
});

/**
 * BlogSingle page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function BlogSingleComponent() {
  const data: BlogSinglePageProps = Route.useLoaderData();
  return <BlogSingle.Component {...data} />;
}
