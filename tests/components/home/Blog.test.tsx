import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Blog } from '../../../app/components/home/Blog';

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
    await waitFor(() => expect(container.querySelector('.is-loading')).toBeNull());
    const cards = container.querySelectorAll('.s-blog-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector('.s-blog-card__title')?.textContent).toBe('Saved post');
  });
});
