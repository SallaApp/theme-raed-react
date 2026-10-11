// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Blog } from '@salla.sa/twilight-theme-engine/routes/blog';
import type { BlogPageProps } from '@salla.sa/twilight-theme-engine/routes/blog';
import { BlogSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Blog route configuration.
 * Loads page data via loader and renders the Blog component.
 */
export const Route = createFileRoute('/{-$locale}/blog')({
  loader: ({ params }): Promise<BlogPageProps> => Blog.loader({ locale: params.locale }),
  head: withHead(Blog),
  pendingComponent: () => <BlogSkeleton />,
  component: BlogComponent,
});

/**
 * Blog page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function BlogComponent() {
  const data: BlogPageProps = Route.useLoaderData();
  return <Blog.Component {...data} />;
}
