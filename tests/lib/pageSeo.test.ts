import { describe, it, expect } from 'vitest';
import { withPageSeo } from '../../app/lib/pageSeo';

const engineHead = {
  title: 'BUGREPRO HTML',
  description: 'BUGREPRO draft content',
  canonical: 'https://store.test/ar/bugrepro/page-1',
  openGraph: { type: 'article', title: 'BUGREPRO HTML', description: 'BUGREPRO draft content' },
};

const page = (metadata?: { title?: string; description?: string }) => ({
  page: { slug: 'page-single', title: 'BUGREPRO HTML', metadata },
});

describe('withPageSeo', () => {
  it("uses the page's SEO title and description", () => {
    const head = withPageSeo(
      engineHead,
      page({ title: 'BUGREPRO SEO TITLE', description: 'BUGREPRO SEO DESCRIPTION' })
    );

    expect(head.title).toBe('BUGREPRO SEO TITLE');
    expect(head.description).toBe('BUGREPRO SEO DESCRIPTION');
    expect(head.openGraph).toMatchObject({
      type: 'article',
      title: 'BUGREPRO SEO TITLE',
      description: 'BUGREPRO SEO DESCRIPTION',
    });
    expect(head.twitter).toMatchObject({ title: 'BUGREPRO SEO TITLE' });
    expect(head.canonical).toBe(engineHead.canonical);
  });

  it('keeps the page name and body when no SEO data is saved', () => {
    expect(withPageSeo(engineHead, page())).toBe(engineHead);
  });

  it('falls back per field, ignoring blank values', () => {
    const head = withPageSeo(engineHead, page({ title: '  ', description: 'Only a description' }));

    expect(head.title).toBe('BUGREPRO HTML');
    expect(head.description).toBe('Only a description');
  });
});
