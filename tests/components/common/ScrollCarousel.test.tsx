import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ScrollCarousel, slidesPerPage } from '../../../app/components/common/ScrollCarousel';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

const measured = ['scrollWidth', 'clientWidth', 'scrollLeft', 'offsetWidth'] as const;

/** Every element measures as a row of this shape: slides 100 wide and no gap in jsdom. */
function layout(sizes: { scrollWidth: number; clientWidth: number; scrollLeft?: number }) {
  const values = { offsetWidth: 100, scrollLeft: 0, ...sizes };
  for (const key of measured) {
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get: () => values[key],
      set: () => {},
    });
  }
}

afterEach(() => {
  cleanup();
  for (const key of measured) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
  document.documentElement.dir = '';
  document.documentElement.style.direction = '';
  vi.restoreAllMocks();
});

const slides = (count: number) =>
  Array.from({ length: count }, (_, index) => <div key={index}>{index}</div>);

function carousel(count = 8, heading?: React.ReactNode) {
  return render(
    <ScrollCarousel prevLabel="Previous" nextLabel="Next" heading={heading}>
      {slides(count)}
    </ScrollCarousel>
  );
}

/** Renders a row partway along in `dir` and returns the `left` each arrow scrolls by. */
function arrowScroll(dir: 'ltr' | 'rtl') {
  document.documentElement.dir = dir;
  document.documentElement.style.direction = dir;
  layout({ scrollWidth: 800, clientWidth: 400, scrollLeft: dir === 'rtl' ? -200 : 200 });
  const scrollBy = vi.fn();
  Element.prototype.scrollBy = scrollBy as unknown as typeof Element.prototype.scrollBy;
  const { getByLabelText } = carousel();
  fireEvent.click(getByLabelText('Previous'));
  fireEvent.click(getByLabelText('Next'));
  return scrollBy.mock.calls.map(([options]) => (options as ScrollToOptions).left);
}

describe('slidesPerPage', () => {
  it('counts the slides that fit whole, gap included', () => {
    expect(slidesPerPage(1260, 24, 321)).toBe(4);
    expect(slidesPerPage(1260, 24, 428)).toBe(3);
  });

  it('is always at least one', () => {
    expect(slidesPerPage(300, 12, 342)).toBe(1);
  });
});

describe('ScrollCarousel arrows', () => {
  it('page back then forward in LTR (towards smaller, then larger scrollLeft)', () => {
    expect(arrowScroll('ltr')).toEqual([-400, 400]);
  });

  it('page back then forward in RTL (towards larger, then smaller scrollLeft)', () => {
    expect(arrowScroll('rtl')).toEqual([400, -400]);
  });

  it('are disabled at each end of the row', () => {
    layout({ scrollWidth: 800, clientWidth: 400, scrollLeft: 0 });
    const start = carousel();
    expect((start.getByLabelText('Previous') as HTMLButtonElement).disabled).toBe(true);
    expect((start.getByLabelText('Next') as HTMLButtonElement).disabled).toBe(false);
    start.unmount();

    layout({ scrollWidth: 800, clientWidth: 400, scrollLeft: 400 });
    const end = carousel();
    expect((end.getByLabelText('Previous') as HTMLButtonElement).disabled).toBe(false);
    expect((end.getByLabelText('Next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('do not exist when every slide fits', () => {
    layout({ scrollWidth: 400, clientWidth: 400 });
    const { queryByLabelText, container } = carousel(3);
    expect(queryByLabelText('Next')).toBeNull();
    expect(container.querySelector('.scroll-carousel__nav')).toBeNull();
  });
});

describe('ScrollCarousel count', () => {
  it('names the slides in view and how many there are', () => {
    layout({ scrollWidth: 800, clientWidth: 400 });
    const { container } = carousel();
    expect(container.querySelector('.scroll-carousel__count')?.textContent).toBe('1–4 of 8');
  });

  it('follows the scroll position, and the last page ends on the last slide', () => {
    layout({ scrollWidth: 800, clientWidth: 400, scrollLeft: -400 });
    const { container } = carousel();
    expect(container.querySelector('.scroll-carousel__count')?.textContent).toBe('5–8 of 8');
  });

  it('names one slide on its own when only one fits', () => {
    layout({ scrollWidth: 800, clientWidth: 100 });
    const { container } = carousel();
    expect(container.querySelector('.scroll-carousel__count')?.textContent).toBe('1 of 8');
  });
});

describe('ScrollCarousel layout', () => {
  it('puts the arrows on the title line when there is a heading', () => {
    layout({ scrollWidth: 800, clientWidth: 400 });
    const { container, getByText } = carousel(8, <h2>Title</h2>);
    const head = container.querySelector('.scroll-carousel__head') as HTMLElement;
    expect(head.contains(getByText('Title'))).toBe(true);
    expect(head.querySelector('.scroll-carousel__nav')).toBeTruthy();
    expect(container.querySelector('.scroll-carousel__foot')).toBeNull();
  });

  it('puts the arrows under the row without one', () => {
    layout({ scrollWidth: 800, clientWidth: 400 });
    const { container } = carousel();
    expect(container.querySelector('.scroll-carousel__head')).toBeNull();
    expect(container.querySelector('.scroll-carousel__foot .scroll-carousel__nav')).toBeTruthy();
  });

  it('has no progress bar', () => {
    layout({ scrollWidth: 800, clientWidth: 400 });
    const { container } = carousel();
    expect(container.querySelector('[class*="progress"]')).toBeNull();
  });

  it('keeps the title in place but hides the arrows until the row is measured', () => {
    const observers: unknown[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: unknown) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      }
    );
    layout({ scrollWidth: 800, clientWidth: 400 });
    const { container } = carousel(8, <h2>Title</h2>);
    expect(observers).toHaveLength(1);
    expect(container.querySelector('.scroll-carousel__nav')?.classList.contains('invisible')).toBe(
      true
    );
    vi.unstubAllGlobals();
  });
});
