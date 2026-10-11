// @auto-generated
import { createFileRoute } from '@tanstack/react-router';
import { slugBrandRedirectLoader } from '@salla.sa/twilight-theme-engine/routes/seo-redirects';

export const Route = createFileRoute('/{-$locale}/$slug/brand-{$id}')({
  loader: ({ params }) =>
    slugBrandRedirectLoader({
      params: { slug: params.slug, id: params.id, locale: params.locale },
    }),
});
