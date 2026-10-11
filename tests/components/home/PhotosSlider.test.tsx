import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PhotosSlider } from '../../../app/components/home/PhotosSlider';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
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

beforeEach(() => {
  Element.prototype.scrollBy = vi.fn();
});

describe('PhotosSlider', () => {
  const mockItems = [
    { url: '/photo1', image: 'photo1.jpg' },
    { url: '/photo2', image: 'photo2.jpg' },
  ];

  it('returns null when no items', () => {
    const { container } = render(<PhotosSlider data={{ items: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a slide per photo, linked to its url', () => {
    const { container } = render(<PhotosSlider data={{ items: mockItems }} />);
    const slides = container.querySelectorAll('.s-photos-slider__slide');
    expect(slides.length).toBe(2);
    expect(slides[0].getAttribute('href')).toBe('/photo1');
  });

  it('renders each image with a src', () => {
    const { container } = render(<PhotosSlider data={{ items: mockItems }} />);
    const imgs = container.querySelectorAll('.s-photos-slider__slide img');
    expect(imgs[0].getAttribute('src')).toBe('photo1.jpg');
    expect(imgs[1].getAttribute('src')).toBe('photo2.jpg');
  });

  it('renders progress + prev/next controls and scrolls on click', () => {
    const { container, getByLabelText } = render(<PhotosSlider data={{ items: mockItems }} />);

    expect(container.querySelector('.scroll-carousel__progress-thumb')).toBeTruthy();
    expect(getByLabelText('Previous')).toBeTruthy();

    fireEvent.click(getByLabelText('Next'));
    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });

  it('cancels the native image drag so a mouse drag on a photo scrolls the slider', () => {
    const { container } = render(<PhotosSlider data={{ items: mockItems }} />);
    const img = container.querySelector('.s-photos-slider__slide img') as HTMLElement;
    expect(fireEvent.dragStart(img)).toBe(false);
  });
});
