import { useEffect, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { ProductGallery } from '../../../app/components/product/ProductGallery';

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: {} } }),
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

// The web component never upgrades in jsdom; report it laid out, as Swiper's afterInit does.
vi.mock('@salla.sa/twilight-components-react/slider', () => ({
  SallaSlider: ({ children, onAfterInit }: { children?: ReactNode; onAfterInit?: () => void }) => {
    useEffect(() => onAfterInit?.(), [onAfterInit]);
    return <div>{children}</div>;
  },
}));

vi.mock('@salla.sa/twilight-components-react/social-share', () => ({
  SallaSocialShare: () => null,
}));

const product = {
  id: 90173339,
  name: 'Course',
  images: [
    { id: 1, url: 'https://cdn.test/a.webp', video_url: null, video_type: null, type: 'image' },
    {
      id: 2,
      url: 'https://img.youtube.com/vi/Breu1_lrOaY/mqdefault.jpg',
      video_url: 'https://youtu.be/Breu1_lrOaY',
      video_type: 'youtube',
      type: 'video',
    },
    {
      id: 3,
      url: 'https://cdn.test/clip.mp4',
      video_url: 'https://cdn.test/clip.mp4',
      video_type: 'video',
      type: 'video',
    },
  ],
} as unknown as Product;

const slides = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLAnchorElement>('a[data-fslightbox]'),
];

beforeEach(() => {
  (window as unknown as { salla: unknown }).salla = {
    event: { on: vi.fn(), off: vi.fn() },
    storage: { get: vi.fn(() => []) },
    wishlist: { event: { onAdded: vi.fn(), onRemoved: vi.fn() } },
  };
});

describe('ProductGallery media', () => {
  it('tells fsLightbox which slide is an image, a YouTube video or an uploaded video', () => {
    const { container } = render(<ProductGallery product={product} />);

    expect(slides(container).map((a) => a.dataset.type)).toEqual(['image', 'youtube', 'video']);
    // A video no longer opens its file in a new tab, which downloads an uploaded one.
    expect(slides(container).some((a) => a.target === '_blank')).toBe(false);
  });

  it("opens a video with no type as YouTube, as Twig's gallery does", () => {
    const untyped = {
      ...product,
      images: [{ ...product.images[1], video_type: null }],
    } as unknown as Product;
    const { container } = render(<ProductGallery product={untyped} />);

    expect(slides(container)[0].dataset.type).toBe('youtube');
  });

  it('opens every image and video of the product in one lightbox', async () => {
    const { container } = render(<ProductGallery product={product} />);
    await waitFor(() => expect(window.refreshFsLightbox).toBeTypeOf('function'));

    fireEvent.click(slides(container)[2]);

    await waitFor(() => expect(document.querySelector('.fslightbox-container')).toBeTruthy());
  });
});

describe('ProductGallery first image', () => {
  it('server-renders the first image over the slider, ahead of the app JS', () => {
    const html = renderToString(<ProductGallery product={product} />);

    expect(html).toContain('class="product-gallery__poster"');
    expect(html).toMatch(
      /product-gallery__poster[^]*?src="https:\/\/cdn\.test\/a\.webp"[^>]*fetchPriority="high"/
    );
  });

  it('drops the copy once the slider is laid out', async () => {
    const { container } = render(<ProductGallery product={product} />);

    await waitFor(() => expect(container.querySelector('.product-gallery__poster')).toBeNull());
  });

  it('renders no copy and sizes for the model when the first item is 3D', () => {
    const model = {
      ...product,
      images: [{ ...product.images[0], three_d_image_url: 'https://cdn.test/a.glb' }],
    } as unknown as Product;

    const html = renderToString(<ProductGallery product={model} />);
    expect(html).not.toContain('product-gallery__poster');
    // Its skeleton reserves the model's height instead of a square.
    expect(html).toContain('product-gallery--model');
  });
});
