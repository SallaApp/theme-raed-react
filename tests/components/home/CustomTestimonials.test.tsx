import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CustomTestimonials } from '../../../app/components/home/CustomTestimonials';

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
    expect(container.querySelector('.s-testimonials__scroller')).toBeTruthy();
  });

  it('renders the rating as "N.0" with the star icon', () => {
    const { container } = render(<CustomTestimonials data={{ items }} />);
    const rating = container.querySelector('.testimonial-card__rating');
    expect(rating?.textContent?.trim()).toBe('5.0');
    expect(rating?.querySelector('svg')).toBeTruthy();
  });

  it('renders name, text and avatar for each card', () => {
    const { container, getByText } = render(<CustomTestimonials data={{ items }} />);
    expect(getByText('ندى الحسيني')).toBeTruthy();
    expect(getByText('رائحة رائعة')).toBeTruthy();
    expect(container.querySelector('.testimonial-card__avatar')?.getAttribute('src')).toBe(
      'a1.jpg'
    );
  });

  it('renders prev / next controls and a progress bar', () => {
    const { container, getByLabelText } = render(<CustomTestimonials data={{ items }} />);
    expect(getByLabelText('Previous')).toBeTruthy();
    expect(getByLabelText('Next')).toBeTruthy();
    expect(container.querySelector('.s-testimonials__progress-thumb')).toBeTruthy();
  });

  it('scrolls the row when a nav button is clicked', () => {
    const { getByLabelText } = render(<CustomTestimonials data={{ items }} />);
    fireEvent.click(getByLabelText('Next'));
    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });

  it('drags the row with the mouse and swallows the trailing click', () => {
    const { container } = render(<CustomTestimonials data={{ items }} />);
    const scroller = container.querySelector('.s-testimonials__scroller') as HTMLElement;

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
    const scroller = container.querySelector('.s-testimonials__scroller') as HTMLElement;
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
