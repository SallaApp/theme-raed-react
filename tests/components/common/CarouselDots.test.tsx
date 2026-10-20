import React, { createRef } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { CarouselDots, pageCount } from '../../../app/components/common/CarouselDots';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

/** A track 300px wide showing a 1000px row, so 0.3 of it is visible. */
function track(direction: 'ltr' | 'rtl' = 'ltr') {
  const el = document.createElement('div');
  el.style.direction = direction;
  Object.defineProperty(el, 'clientWidth', { value: 300 });
  Object.defineProperty(el, 'scrollWidth', { value: 1000 });
  el.scrollTo = vi.fn() as unknown as typeof el.scrollTo;
  document.body.appendChild(el);
  const ref = createRef<HTMLDivElement>() as { current: HTMLDivElement | null };
  ref.current = el;
  return ref;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('pageCount', () => {
  it('is one screenful when the whole row fits, even with a rounding sliver', () => {
    expect(pageCount(1)).toBe(1);
    expect(pageCount(0.995)).toBe(1);
  });

  it('rounds a partial last screen up to a page of its own', () => {
    expect(pageCount(0.5)).toBe(2);
    expect(pageCount(0.3)).toBe(4);
  });
});

describe('CarouselDots', () => {
  it('renders nothing when the row fits on one screen', () => {
    const { container } = render(<CarouselDots track={track()} visible={1} progress={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows one dot per screenful, marking the one in view', () => {
    const { container } = render(<CarouselDots track={track()} visible={0.3} progress={0.7} />);
    const dots = container.querySelectorAll('.carousel-dots__dot');
    expect(dots).toHaveLength(4);
    // 0.7 of the way along four pages lands on the third.
    expect(dots[2].classList.contains('is-active')).toBe(true);
    expect(dots[2].getAttribute('aria-current')).toBe('true');
    expect(dots[0].getAttribute('aria-current')).toBeNull();
    expect(dots[3].getAttribute('aria-label')).toBe('Slide 4');
  });

  it('scrolls to the screenful of the dot it was tapped on', () => {
    const ref = track();
    const { container } = render(<CarouselDots track={ref} visible={0.3} progress={0} />);
    fireEvent.click(container.querySelectorAll('.carousel-dots__dot')[3]);
    expect(ref.current!.scrollTo).toHaveBeenCalledWith({ left: 700, behavior: 'smooth' });
  });

  it('scrolls the other way in RTL, where forward is a negative scrollLeft', () => {
    const ref = track('rtl');
    const { container } = render(<CarouselDots track={ref} visible={0.3} progress={0} />);
    fireEvent.click(container.querySelectorAll('.carousel-dots__dot')[3]);
    expect(ref.current!.scrollTo).toHaveBeenCalledWith({ left: -700, behavior: 'smooth' });
  });
});
