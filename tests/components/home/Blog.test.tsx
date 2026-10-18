import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Blog } from '../../../app/components/home/Blog';

// The common barrel loads every module in the folder; load only the carousel.
vi.mock('../../../app/components/common', async () => ({
  ScrollCarousel: (await vi.importActual<typeof import('../../../app/components/common/ScrollCarousel')>(
    '../../../app/components/common/ScrollCarousel'
  )).ScrollCarousel,
}));

const find = vi.fn();

vi.mock('@salla.sa/twilight-theme-engine/api/blog', () => ({
  blog: {
    queries: {
      article: (id: string) => ({ queryKey: ['blog', 'article', id], queryFn: () => find(id) }),
    },
  },
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  useDate: () => ({ format: (date: unknown) => `formatted:${String(date)}` }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, className }: { to: string; children?: unknown; className?: string }) => (
    <a href={to} className={className}>
      {children as never}
    </a>
  ),
  Image: (props: Record<string, unknown>) => (
    <img alt={String(props.alt ?? '')} src={String(props.src ?? '')} />
  ),
}));

function renderBlog(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const articles: Record<string, object> = {
  '1673272609': {
    id: '-/a-1673272609',
    name: 'أسرار العناية بالعطور',
    promotion_title: 'تخزين العطور بشكل صحيح',
    description: '<p>Body</p>',
    image: 'one.jpg',
    url: '/blog/-/a-1673272609',
    author: 'خالد عبدالله',
    created_at: '12 أكتوبر 2025',
  },
  '160640909': {
    id: '-/a-160640909',
    name: 'فن طبقات العطر',
    description: '<p>يتكون كل عطر من <b>ثلاث</b> طبقات</p>',
    image: 'two.jpg',
    url: '/blog/-/a-160640909',
    author: { name: 'سارة', url: '/blog/author/2' },
    created_at: '2025-10-12',
  },
};

beforeEach(() => {
  find.mockReset();
  find.mockImplementation(async (id: string) => {
    if (!articles[id]) throw new Error(`Article ${id} not found`);
    return articles[id];
  });
});

describe('Blog', () => {
  it('renders nothing when no articles are picked', () => {
    const { container } = renderBlog(<Blog data={{ posts: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('loads each picked article by id and shows its card in the picked order', async () => {
    const { container, getByText } = renderBlog(
      <Blog data={{ posts: ['-/a-1673272609', { id: '-/a-160640909', name: 'old name' }] }} />
    );
    await waitFor(() =>
      expect(container.querySelectorAll('.s-blog-card:not(.is-loading)')).toHaveLength(2)
    );

    expect(find).toHaveBeenCalledWith('1673272609');
    expect(find).toHaveBeenCalledWith('160640909');
    expect(getByText('Blog')).toBeTruthy();

    const [first, second] = container.querySelectorAll('.s-blog-card');
    expect(first.querySelector('img')?.getAttribute('src')).toBe('one.jpg');
    const firstLink = first.querySelector('.s-blog-card__title a');
    expect(firstLink?.getAttribute('href')).toBe('/blog/-/a-1673272609');
    const firstExcerpt = first.querySelector('.s-blog-card__excerpt');
    expect(firstExcerpt?.textContent).toBe('تخزين العطور بشكل صحيح');
    expect(first.querySelector('.s-blog-card__meta')?.textContent).toBe('12 أكتوبر 2025خالد عبدالله');

    expect(second.querySelector('.s-blog-card__title')?.textContent).toBe('فن طبقات العطر');
    const secondExcerpt = second.querySelector('.s-blog-card__excerpt');
    expect(secondExcerpt?.textContent).toBe('يتكون كل عطر من ثلاث طبقات');
    expect(second.querySelector('.s-blog-card__meta')?.textContent).toBe('formatted:2025-10-12سارة');
  });

  it('keeps each pick in its slot when a later pick loads first', async () => {
    let releaseFirst: (article: object) => void = () => undefined;
    find.mockImplementation((id: string) =>
      id === '1673272609'
        ? new Promise((resolve) => {
            releaseFirst = resolve;
          })
        : Promise.resolve(articles[id])
    );
    const { container } = renderBlog(
      <Blog data={{ posts: ['-/a-1673272609', '-/a-160640909'] }} />
    );

    await waitFor(() => expect(container.querySelector('.s-blog-card__title')).toBeTruthy());
    let cards = container.querySelectorAll('.s-blog-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].classList.contains('is-loading')).toBe(true);
    expect(cards[1].querySelector('.s-blog-card__title')?.textContent).toBe('فن طبقات العطر');

    releaseFirst(articles['1673272609']);
    await waitFor(() => expect(container.querySelector('.is-loading')).toBeNull());
    cards = container.querySelectorAll('.s-blog-card');
    expect(cards[0].querySelector('.s-blog-card__title')?.textContent).toBe('أسرار العناية بالعطور');
    expect(cards[1].querySelector('.s-blog-card__title')?.textContent).toBe('فن طبقات العطر');
  });

  it('shows loading cards while the articles load', () => {
    find.mockImplementation(() => new Promise(() => undefined));
    const { container } = renderBlog(<Blog data={{ posts: ['-/a-1673272609'] }} />);
    expect(container.querySelectorAll('.s-blog-card.is-loading')).toHaveLength(1);
  });

  it('falls back to the saved article when it cannot be loaded, and drops one with no name', async () => {
    const { container } = renderBlog(
      <Blog
        data={{
          posts: [{ id: '-/a-999', name: 'Saved post', url: '/blog/-/a-999' }, '-/a-888'],
        }}
      />
    );
    // Each pick waits in its slot until its request fails, then falls back.
    expect(container.querySelectorAll('.s-blog-card.is-loading')).toHaveLength(2);
    await waitFor(() => expect(container.querySelector('.is-loading')).toBeNull());
    expect(find).toHaveBeenCalledWith('999');
    expect(find).toHaveBeenCalledWith('888');
    const cards = container.querySelectorAll('.s-blog-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector('.s-blog-card__title')?.textContent).toBe('Saved post');
  });

  it('shows the merchant title and subtitle', async () => {
    const { container } = renderBlog(
      <Blog
        data={{
          posts: ['-/a-1673272609'],
          title: 'المدونة',
          description: 'تصفح أحدث مقالات المدونة',
        }}
      />
    );
    expect(container.querySelector('.s-blog__title')?.textContent).toBe('المدونة');
    expect(container.querySelector('.s-blog__desc')?.textContent).toBe('تصفح أحدث مقالات المدونة');
  });

  it('hides an empty title and subtitle', () => {
    const { container } = renderBlog(
      <Blog data={{ posts: ['-/a-1673272609'], title: ' ', description: '' }} />
    );
    expect(container.querySelector('.s-blog__head')).toBeNull();
    expect(container.querySelector('.s-blog-card')).toBeTruthy();
  });

  it('falls back to the translated heading when the block has no title saved', () => {
    const { container } = renderBlog(<Blog data={{ posts: ['-/a-1673272609'] }} />);
    expect(container.querySelector('.s-blog__title')?.textContent).toBe('Blog');
    expect(container.querySelector('.s-blog__desc')).toBeNull();
  });

  it('paints the band in the merchant color, or leaves the light gray default', () => {
    const colored = renderBlog(
      <Blog data={{ posts: ['-/a-1673272609'], background_color: '#f5f1ea' }} />
    );
    const band = colored.container.querySelector('.s-blog') as HTMLElement;
    expect(band.style.backgroundColor).toBe('rgb(245, 241, 234)');
    colored.unmount();

    const { container } = renderBlog(
      <Blog data={{ posts: ['-/a-1673272609'], background_color: ' ' }} />
    );
    expect((container.querySelector('.s-blog') as HTMLElement).getAttribute('style')).toBeNull();
  });
});
