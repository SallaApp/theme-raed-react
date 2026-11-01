import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CustomTestimonials } from '../../../app/components/home/CustomTestimonials';

// Only the module under test, not the whole barrel and everything it re-exports.
vi.mock('../../../app/components/common', async () => ({
  TestimonialsCarousel: (await vi.importActual<typeof import('../../../app/components/common/TestimonialsCarousel')>(
    '../../../app/components/common/TestimonialsCarousel'
  )).TestimonialsCarousel,
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

const items = [
  { avatar: 'a1.jpg', name: 'ندى الحسيني', text: 'رائحة رائعة', stars: 5 },
  { avatar: 'a2.jpg', name: 'خالد الأحمد', text: 'أنصح به', stars: 4 },
  { avatar: 'a3.jpg', name: 'هند الزهراني', text: 'ممتاز', stars: 5 },
];

beforeEach(() => {
  Element.prototype.scrollBy = vi.fn();
  // A row that overflows: jsdom has no layout, so everything else would "fit".
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 400 });
});

afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
});

describe('CustomTestimonials', () => {
  it('returns null when there are no items', () => {
    const { container } = render(<CustomTestimonials data={{ items: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the heading and one card per item', () => {
    const { container, getByText } = render(<CustomTestimonials data={{ items }} />);
    expect(getByText('Customer reviews')).toBeTruthy();
    expect(container.querySelectorAll('.testimonial-card')).toHaveLength(3);
    expect(container.querySelector('.scroll-carousel__track')).toBeTruthy();
  });

  it('renders the rating as a row of stars, read out as a number', () => {
    const { container } = render(<CustomTestimonials data={{ items }} />);
    const cards = container.querySelectorAll('.testimonial-card');
    const stars = cards[1].querySelector('.testimonial-card__stars') as HTMLElement;
    expect(stars.getAttribute('role')).toBe('img');
    expect(stars.getAttribute('aria-label')).toBe('4 of 5');
    expect(stars.querySelectorAll('svg')).toHaveLength(5);
    expect(stars.querySelectorAll('svg.is-on')).toHaveLength(4);
  });

  it('leaves the stars out of a review with no rating', () => {
    const { container } = render(<CustomTestimonials data={{ items: [{ name: 'A', text: 'B' }] }} />);
    expect(container.querySelector('.testimonial-card__stars')).toBeNull();
  });

  it('shows the initial when a review has no avatar', () => {
    const { container } = render(
      <CustomTestimonials data={{ items: [{ name: 'ندى', text: 'رائع', stars: 5 }] }} />
    );
    const initial = container.querySelector('.testimonial-card__avatar.is-initial');
    expect(initial?.textContent).toBe('ن');
    expect(initial?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders name, text and avatar for each card', () => {
    const { container, getByText } = render(<CustomTestimonials data={{ items }} />);
    expect(getByText('ندى الحسيني')).toBeTruthy();
    expect(getByText('رائحة رائعة')).toBeTruthy();
    expect(container.querySelector('.testimonial-card__avatar')?.getAttribute('src')).toBe(
      'a1.jpg'
    );
  });

  it('renders prev / next controls on the title line', () => {
    const { container, getByLabelText, getByText } = render(<CustomTestimonials data={{ items }} />);
    expect(getByLabelText('Previous')).toBeTruthy();
    expect(getByLabelText('Next')).toBeTruthy();
    expect(
      container.querySelector('.scroll-carousel__head')?.contains(getByText('Customer reviews'))
    ).toBe(true);
  });

  it('scrolls the row when a nav button is clicked', () => {
    const { getByLabelText } = render(<CustomTestimonials data={{ items }} />);
    fireEvent.click(getByLabelText('Next'));
    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });

  it('drags the row with the mouse and swallows the trailing click', () => {
    const { container } = render(<CustomTestimonials data={{ items }} />);
    const scroller = container.querySelector('.scroll-carousel__track') as HTMLElement;

    fireEvent.pointerDown(scroller, { pointerType: 'mouse', button: 0, clientX: 200 });
    // the pointer is captured (and `is-dragging` added) only once the drag moves,
    // so a plain click still reaches the element under it
    expect(scroller.classList.contains('is-dragging')).toBe(false);

    fireEvent.pointerMove(scroller, { clientX: 120 });
    expect(scroller.classList.contains('is-dragging')).toBe(true);

    fireEvent.pointerUp(scroller, { clientX: 120 });
    expect(scroller.classList.contains('is-dragging')).toBe(false);

    // a drag past the threshold cancels the click it would otherwise fire
    expect(fireEvent.click(scroller)).toBe(false);
  });

  it('leaves plain clicks (no drag) alone', () => {
    const { container } = render(<CustomTestimonials data={{ items }} />);
    const scroller = container.querySelector('.scroll-carousel__track') as HTMLElement;
    fireEvent.pointerDown(scroller, { pointerType: 'mouse', button: 0, clientX: 200 });
    fireEvent.pointerUp(scroller, { clientX: 200 });
    expect(fireEvent.click(scroller)).toBe(true);
  });

  it('uses the block title/description when provided', () => {
    const { getByText } = render(
      <CustomTestimonials
        data={{ items, title: 'آراء العملاء', description: 'اكتشف تجارب عملائنا' }}
      />
    );
    expect(getByText('آراء العملاء')).toBeTruthy();
    expect(getByText('اكتشف تجارب عملائنا')).toBeTruthy();
  });
});
