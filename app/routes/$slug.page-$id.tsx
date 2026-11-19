import { createFileRoute } from '@tanstack/react-router';
import { page as pageApi } from '@salla.sa/twilight-theme-engine/api/page';
import { PageSingle as EnginePageSingle } from '@salla.sa/twilight-theme-engine/routes/page';
import { withHead } from '@salla.sa/twilight-theme-engine/tanstack';
import { PageSingle, type PageSingleProps } from '../components/page/PageSingle';
import { withPageSeo } from '../lib/pageSeo';

export const Route = createFileRoute('/{-$locale}/$slug/page-{$id}')({
  loader: async ({ params }): Promise<PageSingleProps> => {
    const data = await pageApi.findOrThrow(params.id);
    return {
      page: {
        // RouteId.PAGE_SINGLE, which the engine does not export.
        slug: 'page-single',
        id: data.id,
        title: data.name,
        url: data.url,
        content: data.content,
        metadata: data.metadata,
        created_at: data.created_at,
        type: data.type,
      },
    };
  },
  head: withHead(EnginePageSingle, (head, _ctx, data) => withPageSeo(head, data)),
  component: PageSingleComponent,
});

function PageSingleComponent() {
  const data = Route.useLoaderData();
  return <PageSingle {...data} />;
}
