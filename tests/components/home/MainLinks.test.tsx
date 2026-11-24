import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MainLinks } from '../../../app/components/home/MainLinks';

// The common barrel loads every module in the folder; load only the carousel.
vi.mock('../../../app/components/common', async () => ({
  ScrollCarousel: (
    await vi.importActual<typeof import('../../../app/components/common/ScrollCarousel')>(
      '../../../app/components/common/ScrollCarousel'
    )
  ).ScrollCarousel,
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

// Mock the sub-path exports
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({
    to,
    children,
    className,
    target,
  }: {
    to: string;
    children?: React.ReactNode;
    className?: string;
    target?: string;
  }) => (
    <a href={to} className={className} target={target}>
      {children}
    </a>
  ),
}));

describe('MainLinks', () => {
  const mockLinks = [
    { url: '/cat1', icon: 'sicon-cat1', title: 'Category 1' },
    { url: '/cat2', icon: 'sicon-cat2', title: 'Category 2' },
  ];

  const mockCategories = [
    { url: '/cat1', name: 'Category 1', icon: 'sicon-cat1' },
    { url: '/cat2', name: 'Category 2', image: 'cat2.jpg' },
  ];

  // TD-18336: `<salla-slider>` (deferred to the browser) sent only a skeleton from the
  // server, so the links showed up late; the row is now plain markup in the server HTML.
  it('renders its links in the server HTML, not a deferred <salla-slider>', () => {
    const html = renderToString(<MainLinks data={{ links: mockLinks, position: 1 }} />);
    expect(html).not.toContain('salla-slider');
    expect(html).toContain('id="main-links-1"');
    expect(html).toContain('href="/cat1"');
    expect(html).toContain('href="/cat2"');
    expect(html).toContain('s-main-links__track');
  });

  // TD-18336: Raed's default links are `offers_link` items, which the API sends with no
  // `url`; they rendered as <a> with no href.
  it('links an item set to a fixed page (offers) to that page', () => {
    const { container } = render(
      <MainLinks
        data={{
          links: [
            { icon: 'sicon-packed-box', title: 'Ready products', url__type: 'offers_link' },
            { icon: 'sicon-cake', title: 'Food', url__type: 'offers_link' },
          ],
        }}
      />
    );
    const hrefs = Array.from(container.querySelectorAll('a.slide--cat-entry')).map((a) =>
      a.getAttribute('href')
    );
    expect(hrefs).toEqual(['/offers', '/offers']);
  });

  it('shows the arrows only when show_controls is on', () => {
    // A row wider than its box (jsdom measures every element 0 wide, a row that fits).
    const sizes = { scrollWidth: 800, clientWidth: 400 };
    for (const [key, value] of Object.entries(sizes)) {
      Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value });
    }
    try {
      const { container: off } = render(<MainLinks data={{ links: mockLinks }} />);
      expect(off.querySelector('.scroll-carousel__nav')).toBeNull();

      const { container: on } = render(
        <MainLinks data={{ links: mockLinks, show_controls: true }} />
      );
      expect(on.querySelector('.scroll-carousel__nav')).not.toBeNull();
    } finally {
      for (const key of Object.keys(sizes)) {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
      }
    }
  });

  it('shows the title in the row heading', () => {
    const { container } = render(<MainLinks data={{ links: mockLinks, title: 'Shop by type' }} />);
    const title = container.querySelector('.scroll-carousel__heading h2');
    expect(title?.textContent).toBe('Shop by type');
    // The merged-with-the-block-above styles target this class.
    expect(title?.classList.contains('s-slider-block__title')).toBe(true);
  });

  it('renders links with icon', () => {
    const { container } = render(<MainLinks data={{ links: mockLinks }} />);
    const icon = container.querySelector('.slide--cat-entry i');
    expect(icon?.className).toBe('sicon-cat1');
  });

  it("shows a link's image instead of its icon", () => {
    const { container } = render(
      <MainLinks
        data={{
          links: [
            { url: '/perfume', icon: 'sicon-cat1', image: 'perfume.png', title: 'Perfume' },
            { url: '/gifts', icon: 'sicon-gift', title: 'Gifts' },
          ],
        }}
      />
    );
    const [withImage, withIcon] = Array.from(container.querySelectorAll('.slide--cat-entry'));
    const img = withImage.querySelector('img');
    expect(img?.getAttribute('src')).toBe('perfume.png');
    expect(withImage.querySelector('i')).toBeNull();
    // No image: the icon, as before.
    expect(withIcon.querySelector('img')).toBeNull();
    expect(withIcon.querySelector('i')?.className).toBe('sicon-gift');
  });

  it('renders links with title', () => {
    const { container } = render(<MainLinks data={{ links: mockLinks }} />);
    const title = container.querySelector('.slide--cat-entry h2');
    expect(title?.textContent).toBe('Category 1');
  });

  it('renders categories when show_cats is true', () => {
    const { container } = render(
      <MainLinks data={{ categories: mockCategories, show_cats: true }} />
    );
    const items = container.querySelectorAll('.slide--one-eighth');
    expect(items.length).toBe(2);
  });

  it('renders category with image', () => {
    const { container } = render(
      <MainLinks data={{ categories: mockCategories, show_cats: true }} />
    );
    const img = container.querySelector('.slide--cat-entry img');
    expect(img?.getAttribute('src')).toBe('cat2.jpg');
  });

  it.each([
    ['link', { links: [{ url: '/perfume', image: 'perfume.png', title: 'Perfume' }] }],
    [
      'category',
      { categories: [{ url: '/perfume', image: 'perfume.png', name: 'Perfume' }], show_cats: true },
    ],
  ])('names a %s with an image once, by the title shown beside it', (_kind, data) => {
    const { container } = render(<MainLinks data={data} />);
    const entry = container.querySelector('.slide--cat-entry')!;
    // An empty alt leaves the image out of the link's name ("Perfume", not "Perfume Perfume").
    expect(entry.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(entry.querySelector('h2')?.textContent).toBe('Perfume');
  });

  it('returns null when no links', () => {
    const { container } = render(<MainLinks data={{ links: [] }} />);
    expect(container.firstChild).toBeNull();
  });
});
