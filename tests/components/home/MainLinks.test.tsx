import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MainLinks, mainLinksClassName } from '../../../app/components/home/MainLinks';
import twilight from '../../../twilight.json';

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

  it('renders SallaSlider with carousel type', () => {
    const { container } = render(<MainLinks data={{ links: mockLinks, position: 1 }} />);
    const slider = container.querySelector('salla-slider');
    expect(slider?.getAttribute('type')).toBe('carousel');
    expect(slider?.getAttribute('id')).toBe('main-links-1');
    expect(slider?.getAttribute('controls-outer')).toBe('true');
    expect(slider?.getAttribute('show-controls')).toBe('false');
  });

  it('centers links that fit without scrolling instead of leaving them at the start edge', () => {
    const { container } = render(<MainLinks data={{ links: mockLinks }} />);
    const config = JSON.parse(
      container.querySelector('salla-slider')?.getAttribute('slider-config') ?? '{}'
    );
    expect(config.centerInsufficientSlides).toBe(true);
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

describe('mainLinksClassName', () => {
  // The switch's id in the block's twilight.json fields: the key the store saves it under.
  const mergeId = (
    twilight.components.find((c) => c.path === 'home.main-links')?.fields ?? []
  ).find((f) => f.label === 'دمج مع العنصر السابق')?.id as string;

  it('merges with the block above when the merchant turns the switch on', () => {
    expect(mainLinksClassName({ [mergeId]: true, title: 'Shop by category' })).toBe(
      's-block s-block--main-links merge-with-top-component'
    );
  });

  it('pulls a merged block without a title up further', () => {
    expect(mainLinksClassName({ [mergeId]: true })).toBe(
      's-block s-block--main-links merge-with-top-component merged-has-no-title'
    );
  });

  it('keeps the block in place with the switch off', () => {
    expect(mainLinksClassName({ [mergeId]: false })).toBe('s-block s-block--main-links');
    expect(mainLinksClassName({})).toBe('s-block s-block--main-links');
  });

  it("still reads the engine's name for the switch", () => {
    expect(mainLinksClassName({ merge_links_with_top_component: true, title: 'Links' })).toBe(
      's-block s-block--main-links merge-with-top-component'
    );
  });
});
