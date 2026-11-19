import type { HeadDescriptor } from '@salla.sa/twilight-theme-engine/utils/head';
import type { PageSingleProps } from '@salla.sa/twilight-theme-engine/routes/page';

/**
 * Applies the page's "SEO Data" (theme editor → Pages → ⋯ → SEO Data) to the
 * engine's page head, which builds the title from the page name and the
 * description from the page body.
 *
 * Mirrors the Twig storefront (`SeoPageWidget`): the SEO title replaces the
 * page name, the SEO description replaces the body text, and an empty value
 * keeps the engine's default. `withHead` still appends ` - <store>`.
 */
export function withPageSeo(head: HeadDescriptor, { page }: PageSingleProps): HeadDescriptor {
  const title = page.metadata?.title?.trim() || head.title;
  const description = page.metadata?.description?.trim() || head.description;
  if (title === head.title && description === head.description) return head;

  return {
    ...head,
    title,
    description,
    openGraph: { ...head.openGraph, title, description },
    twitter: { ...head.twitter, title, description },
  };
}
