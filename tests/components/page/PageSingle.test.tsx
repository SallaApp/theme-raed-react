import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PageSingle, type PageWithType } from '../../../app/components/page/PageSingle';

vi.mock('@salla.sa/twilight-theme-engine/hooks/useComments', () => ({
  useComments: () => ({ commentsKey: 0, refresh: vi.fn() }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: ({ page }: { page: { title: string } }) => (
    <nav className="breadcrumb">{page.title}</nav>
  ),
}));

vi.mock('@salla.sa/twilight-components-react/comments', () => ({
  SallaComments: ({ itemId }: { itemId: number }) => (
    <div className="salla-comments" data-item-id={itemId} />
  ),
}));

vi.mock('../../../app/components/common/BlockHookSlot', () => ({
  BlockHookSlot: ({
    name,
    wrapper,
    className,
    scope,
  }: {
    name: string;
    wrapper: string;
    className?: string;
    scope?: unknown;
  }) => (
    <div
      className="block-hook-slot"
      data-name={name}
      data-wrapper={wrapper}
      data-class={className}
      data-scope={JSON.stringify(scope)}
    />
  ),
}));

function makePage(overrides: Partial<PageWithType> = {}): PageWithType {
  return {
    slug: 'about-us',
    id: 42,
    title: 'About Us',
    url: '/about-us',
    content: '<p>Hello&nbsp;world</p>',
    metadata: undefined,
    created_at: { published_time: '2026-01-01T00:00:00Z' },
    ...overrides,
  };
}

describe('PageSingle', () => {
  describe('customised pages', () => {
    it('renders only the information_page app hook, nothing else', () => {
      const { container } = render(<PageSingle page={makePage({ type: 'customised' })} />);

      const hook = container.querySelector('.block-hook-slot');
      expect(hook).toBeTruthy();
      expect(hook?.getAttribute('data-name')).toBe('information_page.information_page');
      expect(hook?.getAttribute('data-wrapper')).toBe('s-information-page');
      expect(hook?.getAttribute('data-class')).toBe('!mt-0');
      expect(hook?.getAttribute('data-scope')).toBe('{"page_id":42}');

      expect(container.querySelector('.breadcrumb')).toBeNull();
      expect(container.querySelector('.content-entry')).toBeNull();
      expect(container.querySelector('.salla-comments')).toBeNull();
      expect(container.querySelector('h1')).toBeNull();
    });
  });

  describe('ordinary pages', () => {
    it('renders the breadcrumb, title, cleaned content and comments', () => {
      const { container } = render(<PageSingle page={makePage()} />);

      expect(container.querySelector('.block-hook-slot')).toBeNull();
      expect(container.querySelector('.breadcrumb')?.textContent).toBe('About Us');
      expect(container.querySelector('h1')?.textContent).toBe('About Us');

      const content = container.querySelector('.content-entry');
      expect(content?.innerHTML).toBe('<p>Hello world</p>');

      const comments = container.querySelector('.salla-comments');
      expect(comments?.getAttribute('data-item-id')).toBe('42');
    });

    it('omits the content block when the page has no content', () => {
      const { container } = render(<PageSingle page={makePage({ content: undefined })} />);
      expect(container.querySelector('.content-entry')).toBeNull();
    });

    it('omits comments when the page has no id', () => {
      const { container } = render(<PageSingle page={makePage({ id: undefined })} />);
      expect(container.querySelector('.salla-comments')).toBeNull();
    });

    it('treats any non-customised type the same as the default layout', () => {
      const { container } = render(<PageSingle page={makePage({ type: 'faq' })} />);
      expect(container.querySelector('.block-hook-slot')).toBeNull();
      expect(container.querySelector('h1')?.textContent).toBe('About Us');
    });
  });
});
