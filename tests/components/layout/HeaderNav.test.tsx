import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeaderNav } from '../../../app/components/layout/HeaderNav';
import {
  CrownIcon,
  DashboardSquare01Icon,
  DiscountTagIcon,
  NoteIcon,
} from '../../../app/components/icons';

const query: { data: unknown[] } = { data: [] };

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => query,
}));

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return { ...actual, createPortal: (node: React.ReactNode) => node };
});

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({
    t: (_k: string, fb?: string) => fb ?? _k,
    languageName: 'English',
    isRTL: false,
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({
    store: { name: 'Store', url: '/', logo: '/logo.png', settings: {} },
    currency: { code: 'SAR' },
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/api/menu', () => ({
  menu: { queries: { header: () => ({ queryKey: ['menus', 'header'] }) } },
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, className, onClick }: Record<string, unknown>) => (
    <a href={String(to)} className={className as string} onClick={onClick as () => void}>
      {children as React.ReactNode}
    </a>
  ),
  Image: ({ src, alt }: Record<string, unknown>) => <img src={src as string} alt={alt as string} />,
}));

const items = [
  { id: 1, title: 'Offers', url: '/offers' },
  {
    id: 2,
    title: 'Home',
    url: '/home',
    children: [
      { id: 21, title: 'Living room', url: '/living' },
      { id: 22, title: 'Bedroom', url: '/bedroom' },
    ],
  },
];

beforeEach(() => {
  query.data = [];
  document.body.className = '';
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HeaderNav', () => {
  it('renders nothing while closed', () => {
    query.data = items;
    const { container } = render(<HeaderNav open={false} onClose={() => {}} />);
    expect(container.querySelector('.site-nav-drawer')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('opens on the root Miller column, then drills into a parent', () => {
    query.data = items;
    const { container, getByText, queryByText } = render(<HeaderNav open onClose={() => {}} />);

    expect(container.querySelector('.site-nav-drawer')).toBeTruthy();

    // Root column only: the two top-level rows, one of them a parent trigger.
    // Child rows are not mounted until their parent is opened.
    expect(container.querySelectorAll('.site-nav-drawer__panel').length).toBe(1);
    expect(container.querySelectorAll('.site-nav-drawer__link').length).toBe(2);
    expect(container.querySelectorAll('.site-nav-drawer__link--parent').length).toBe(1);
    expect(queryByText('Living room')).toBeNull();

    // Open the "Home" parent → a second column with its children appears.
    fireEvent.click(getByText('Home'));

    expect(container.querySelectorAll('.site-nav-drawer__panel').length).toBe(2);
    expect(container.querySelectorAll('.site-nav-drawer__link').length).toBe(4);
    expect(container.querySelectorAll('.site-nav-drawer__link--parent').length).toBe(1);
    expect(getByText('Living room')).toBeTruthy();
    expect(getByText('Bedroom')).toBeTruthy();
    expect(container.querySelector('.site-nav-drawer__browse-all')).toBeTruthy();
  });

  it('starts at the root column again when reopened after closing', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    query.data = items;
    const onClose = () => {};
    const { container, getByText, rerender } = render(<HeaderNav open onClose={onClose} />);

    fireEvent.click(getByText('Home'));
    expect(container.querySelectorAll('.site-nav-drawer__panel').length).toBe(2);

    // Close, and let the exit transition finish so the drawer leaves the tree.
    rerender(<HeaderNav open={false} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(container.querySelector('.site-nav-drawer')).toBeNull();

    rerender(<HeaderNav open onClose={onClose} />);
    expect(container.querySelectorAll('.site-nav-drawer__panel').length).toBe(1);
    expect(container.querySelector('.site-nav-drawer__browse-all')).toBeNull();
  });

  it('locks body scroll while open', () => {
    query.data = items;
    render(<HeaderNav open onClose={() => {}} />);
    expect(document.body.classList.contains('menu-opened')).toBe(true);
  });

  // A root row with no image used to skip the `.site-nav-drawer__label`
  // wrapper entirely, leaving its text flush against the row edge instead of
  // lined up with an image row's text (image width + gap to its right).
  it('reserves the image slot on an image-less root row, so its title lines up with the rows that have one', () => {
    query.data = [
      { id: 1, title: 'Offers', url: '/offers' }, // no image
      { id: 2, title: 'Accessories', url: '/accessories', image: 'https://cdn.example.com/a.png' },
    ];
    const { container } = render(<HeaderNav open onClose={() => {}} />);

    const rows = container.querySelectorAll('.site-nav-drawer__link');
    expect(rows.length).toBe(2);

    // Both rows wrap their title in the same label box...
    const labels = container.querySelectorAll('.site-nav-drawer__label');
    expect(labels.length).toBe(2);

    // ...the image-less row gets the same-size empty placeholder instead of
    // an <img>, not a shorter box.
    const [offersLabel, accessoriesLabel] = Array.from(labels);
    expect(offersLabel.querySelector('.site-nav-drawer__link-img-placeholder')).toBeTruthy();
    expect(offersLabel.querySelector('.site-nav-drawer__link-img')).toBeNull();
    expect(accessoriesLabel.querySelector('.site-nav-drawer__link-img')).toBeTruthy();
    expect(accessoriesLabel.querySelector('.site-nav-drawer__link-img-placeholder')).toBeNull();
  });

  it('fills an image-less root row with a grey circle and the icon for its page', () => {
    query.data = [
      { id: 'offers', title: 'Offers', url: '/offers' },
      { id: 'blog', title: 'Blog', url: '/blog' },
      { id: 3, title: 'Brands', url: '/ar/brands' },
      { id: 4, title: 'Dresses', url: '/dresses' },
      { id: 5, title: 'Accessories', url: '/accessories', image: 'https://cdn.example.com/a.png' },
    ];
    const { container } = render(<HeaderNav open onClose={() => {}} />);

    const placeholders = Array.from(
      container.querySelectorAll('.site-nav-drawer__link-img-placeholder')
    );
    expect(placeholders.map((el) => el.getAttribute('data-kind'))).toEqual([
      'offers',
      'blog',
      'brands',
      'general',
    ]);

    // Each circle draws its own page's icon: compare the drawn paths with the icon's.
    const paths = (markup: string) => {
      const host = document.createElement('div');
      host.innerHTML = markup;
      return host.querySelector('svg')?.innerHTML;
    };
    const expected = [DiscountTagIcon, NoteIcon, CrownIcon, DashboardSquare01Icon].map((Icon) =>
      paths(renderToStaticMarkup(<Icon />))
    );
    expect(new Set(expected).size).toBe(4);
    expect(placeholders.map((el) => paths(el.innerHTML))).toEqual(expected);
  });

  // When *no* root item has an image, reserving a same-size empty spacer on
  // every row is just wasted space -- nothing to line titles up against.
  it('reserves no placeholder at all when no root item has an image', () => {
    query.data = [
      { id: 1, title: 'Offers', url: '/offers' },
      { id: 2, title: 'Dresses', url: '/dresses' },
    ];
    const { container } = render(<HeaderNav open onClose={() => {}} />);

    const rows = container.querySelectorAll('.site-nav-drawer__link');
    expect(rows.length).toBe(2);
    expect(container.querySelector('.site-nav-drawer__label')).toBeNull();
    expect(container.querySelector('.site-nav-drawer__link-img-placeholder')).toBeNull();
    expect(container.querySelector('.site-nav-drawer__link-img')).toBeNull();
  });

  // A non-root column (drilled into a parent) never shows images at all --
  // confirms the placeholder fix doesn't leak the label wrapper in there too.
  it('does not wrap child-column titles in the image label at all', () => {
    query.data = [
      {
        id: 2,
        title: 'Home',
        url: '/home',
        children: [
          { id: 21, title: 'Living room', url: '/living', image: 'https://cdn.example.com/b.png' },
        ],
      },
    ];
    const { container, getByText } = render(<HeaderNav open onClose={() => {}} />);

    fireEvent.click(getByText('Home'));

    const childRow = Array.from(container.querySelectorAll('.site-nav-drawer__link')).find((el) =>
      el.textContent?.includes('Living room')
    );
    expect(childRow?.querySelector('.site-nav-drawer__label')).toBeNull();
    expect(childRow?.querySelector('.site-nav-drawer__link-img-placeholder')).toBeNull();
  });
});
