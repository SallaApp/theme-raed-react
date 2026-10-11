// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { Testimonials } from '@salla.sa/twilight-theme-engine/routes/testimonials';
import type { TestimonialsPageProps } from '@salla.sa/twilight-theme-engine/routes/testimonials';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';

/**
 * Testimonials route configuration.
 * Loads page data via loader and renders the Testimonials component.
 */
export const Route = createFileRoute('/{-$locale}/testimonials')({
  loader: ({ params }): Promise<TestimonialsPageProps> =>
    Testimonials.loader({ locale: params.locale }),
  head: withHead(Testimonials),
  component: TestimonialsComponent,
});

/**
 * Testimonials page component.
 * Uses Route.useLoaderData() to access the data loaded by the route loader,
 * following React best practices for data fetching in route components.
 */
function TestimonialsComponent() {
  const data: TestimonialsPageProps = Route.useLoaderData();
  return <Testimonials.Component {...data} />;
}
