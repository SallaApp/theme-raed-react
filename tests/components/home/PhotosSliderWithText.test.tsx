import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, fireEvent } from '@testing-library/react';
import { PhotosSliderWithText } from '../../../app/components/home/PhotosSliderWithText';

// The common barrel loads every module in the folder; load only the carousel.
vi.mock('../../../app/components/common', async () => ({
  ScrollCarousel: (await vi.importActual<typeof import('../../../app/components/common/ScrollCarousel')>(
    '../../../app/components/common/ScrollCarousel'
  )).ScrollCarousel,
}));

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
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('PhotosSliderWithText', () => {
  const slides = [
    {
      image: 'one.jpg',
      title: 'إصدارات حصرية',
      description: 'عطور محدودة الإصدار',
      btnname: 'اكتشف الجديد',
      url: '/new',
    },
    { image: 'two.jpg', title: 'هدايا العطور الفاخرة', url: '/gifts' },
  ];

  it('returns null when there are no slides', () => {
    const { container } = render(<PhotosSliderWithText data={{ slides: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a card per slide with its image, title and description', () => {
    const { container, getByText } = render(<PhotosSliderWithText data={{ slides }} />);
    expect(container.querySelectorAll('.s-text-photos-slider__slide')).toHaveLength(2);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('one.jpg');
    expect(getByText('إصدارات حصرية')).toBeTruthy();
    expect(getByText('عطور محدودة الإصدار')).toBeTruthy();
  });

  it('shows the button, linked to the slide url, when it has text', () => {
    const { getByText } = render(<PhotosSliderWithText data={{ slides }} />);
    const button = getByText('اكتشف الجديد');
    expect(button.className).toContain('home-slider__cta');
    expect(button.getAttribute('href')).toBe('/new');
  });

  it('hides the button when its text is empty, and links the whole card instead', () => {
    const { container } = render(
      <PhotosSliderWithText data={{ slides: [{ ...slides[1], btnname: '  ' }] }} />
    );
    expect(container.querySelector('.home-slider__cta')).toBeNull();
    expect(container.querySelector('.s-text-photos-slider__slide')?.getAttribute('href')).toBe(
      '/gifts'
    );
  });

  it('drops the overlay when the slide switches it off', () => {
    const { container } = render(
      <PhotosSliderWithText data={{ slides: [{ ...slides[0], without_overlay: true }] }} />
    );
    expect(container.querySelector('.s-text-photos-slider__overlay')).toBeNull();
  });

  it('scrolls on the arrows', () => {
    const { getByLabelText } = render(<PhotosSliderWithText data={{ slides }} />);
    fireEvent.click(getByLabelText('Next'));
    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });

  it('auto scrolls unless switched off, and waits while hovered', () => {
    vi.useFakeTimers();
    // The test setup matches every query, reduced motion included, which turns autoplay off.
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) => ({ matches: false, media: query }) as MediaQueryList
    );
    const scrollable = (track: HTMLElement) => {
      Object.defineProperty(track, 'scrollWidth', { value: 2000, configurable: true });
      Object.defineProperty(track, 'clientWidth', { value: 1000, configurable: true });
    };

    const off = render(<PhotosSliderWithText data={{ slides, auto_play: false }} />);
    scrollable(off.container.querySelector('.scroll-carousel__track') as HTMLElement);
    act(() => vi.advanceTimersByTime(6000));
    expect(Element.prototype.scrollBy).not.toHaveBeenCalled();
    off.unmount();

    const { container } = render(<PhotosSliderWithText data={{ slides }} />);
    scrollable(container.querySelector('.scroll-carousel__track') as HTMLElement);
    const carousel = container.querySelector('.scroll-carousel') as HTMLElement;
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(6000));
    expect(Element.prototype.scrollBy).not.toHaveBeenCalled();

    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(5000));
    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(1);
  });

  it('stops auto scrolling when the visitor turns on reduced motion mid-visit', () => {
    vi.useFakeTimers();
    let reduce = false;
    const listeners = new Set<() => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          get matches() {
            return query.includes('reduced-motion') ? reduce : false;
          },
          media: query,
          addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
        }) as unknown as MediaQueryList
    );

    const { container } = render(<PhotosSliderWithText data={{ slides }} />);
    const track = container.querySelector('.scroll-carousel__track') as HTMLElement;
    Object.defineProperty(track, 'scrollWidth', { value: 2000, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: 1000, configurable: true });
    act(() => vi.advanceTimersByTime(5000));
    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(1);

    reduce = true;
    act(() => listeners.forEach((listener) => listener()));
    act(() => vi.advanceTimersByTime(15000));
    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(1);
  });
});
