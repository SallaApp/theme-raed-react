import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { PhotosSlider } from '../../../app/components/home/PhotosSlider';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({
    to,
    children,
    className,
    ...rest
  }: {
    to: string;
    children?: unknown;
    className?: string;
    tabIndex?: number;
    'aria-hidden'?: boolean;
  }) => (
    <a href={to} className={className} {...rest}>
      {children as never}
    </a>
  ),
  Image: ({
    alt,
    src,
    priority,
  }: {
    alt?: string;
    src?: string;
    priority?: boolean;
  }) => <img alt={alt ?? ''} src={src ?? ''} data-priority={priority ? 'yes' : undefined} />,
}));

const items = [
  { url: '/photo1', image: 'photo1.jpg' },
  { url: '/photo2', image: 'photo2.jpg' },
  { url: '/photo3', image: 'photo3.jpg' },
];

let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollTo = vi.fn();
  Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches: false, media: query }) as MediaQueryList
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const realSlides = (container: HTMLElement) =>
  container.querySelectorAll('.s-photos-slider__slide:not([aria-hidden="true"])');

/** Lays the row out: slides 100 apart, each centred by a `scrollLeft` of its index × 100. */
function layOut(container: HTMLElement) {
  const track = container.querySelector('.s-photos-stage__track') as HTMLElement;
  Object.defineProperty(track, 'clientWidth', { value: 100, configurable: true });
  Array.from(track.children).forEach((slide, index) => {
    Object.defineProperty(slide, 'offsetLeft', { value: index * 100, configurable: true });
    Object.defineProperty(slide, 'offsetWidth', { value: 100, configurable: true });
  });
  return track;
}

function scrollRowTo(track: HTMLElement, left: number) {
  track.scrollLeft = left;
  fireEvent.scroll(track);
}

describe('PhotosSlider', () => {
  it('returns null when no items', () => {
    const { container } = render(<PhotosSlider data={{ items: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a real slide per photo, linked to its url, between two sets of copies', () => {
    const { container } = render(<PhotosSlider data={{ items }} />);
    expect(container.querySelectorAll('.s-photos-slider__slide')).toHaveLength(9);
    const real = realSlides(container);
    expect(real).toHaveLength(3);
    expect(real[0].getAttribute('href')).toBe('/photo1');
    expect(real[0].querySelector('img')?.getAttribute('src')).toBe('photo1.jpg');
    expect(real[1].querySelector('img')?.getAttribute('src')).toBe('photo2.jpg');
  });

  it('keeps the copies out of the tab order and the accessibility tree', () => {
    const { container } = render(<PhotosSlider data={{ items }} />);
    const copies = container.querySelectorAll('.s-photos-slider__slide[aria-hidden="true"]');
    expect(copies).toHaveLength(6);
    copies.forEach((copy) => {
      expect(copy.getAttribute('tabindex')).toBe('-1');
      expect(copy.querySelector('img')?.getAttribute('alt')).toBe('');
    });
  });

  it('asks for the first banner eagerly, and only that one', () => {
    const { container } = render(<PhotosSlider data={{ items }} />);
    const eager = container.querySelectorAll('img[data-priority="yes"]');
    expect(eager).toHaveLength(1);
    expect(eager[0]).toBe(realSlides(container)[0].querySelector('img'));
  });

  it('server-renders the last banner beside the first, with no script needed to centre it', () => {
    const html = renderToString(<PhotosSlider data={{ items }} />);
    const page = document.createElement('div');
    page.innerHTML = html;
    expect(page.querySelector('.s-photos-stage')?.classList.contains('is-static')).toBe(true);
    const slides = page.querySelectorAll('.s-photos-slider__slide');
    expect(slides).toHaveLength(4);
    expect(slides[0].getAttribute('aria-hidden')).toBe('true');
    expect(slides[0].querySelector('img')?.getAttribute('src')).toBe('photo3.jpg');
    expect(slides[1].classList.contains('is-current')).toBe(true);
  });

  it('starts on the first real banner once it can scroll', () => {
    const { container } = render(<PhotosSlider data={{ items }} />);
    expect(container.querySelector('.s-photos-stage')?.classList.contains('is-static')).toBe(false);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));
  });

  it('shows one banner alone: no copies, arrows or pager', () => {
    const { container, queryByLabelText } = render(
      <PhotosSlider data={{ items: items.slice(0, 1) }} />
    );
    expect(container.querySelectorAll('.s-photos-slider__slide')).toHaveLength(1);
    expect(container.querySelector('.s-photos-stage')?.classList.contains('is-single')).toBe(true);
    expect(queryByLabelText('Next')).toBeNull();
    expect(container.querySelector('.s-photos-stage__pager')).toBeNull();
  });

  it('moves one banner along on the arrows', () => {
    const { container, getByLabelText } = render(<PhotosSlider data={{ items }} />);
    const track = layOut(container);
    scrollRowTo(track, 300);
    scrollTo.mockClear();

    fireEvent.click(getByLabelText('Next'));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
  });

  it('adds up arrow clicks made while the row is still moving', () => {
    const { container, getByLabelText } = render(<PhotosSlider data={{ items }} />);
    const track = layOut(container);
    scrollRowTo(track, 300);

    fireEvent.click(getByLabelText('Previous'));
    fireEvent.click(getByLabelText('Previous'));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 100, behavior: 'smooth' });
  });

  it('goes to the banner of the segment it was clicked on, by its middle copy', () => {
    const { container, getByLabelText } = render(<PhotosSlider data={{ items }} />);
    layOut(container);
    fireEvent.click(getByLabelText('Slide 3'));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 500, behavior: 'smooth' });
  });

  it('marks the banner and its segment as the row moves, on every copy', () => {
    const { container, getByLabelText } = render(<PhotosSlider data={{ items }} />);
    const track = layOut(container);
    expect(getByLabelText('Slide 1').getAttribute('aria-current')).toBe('true');

    scrollRowTo(track, 400);
    expect(getByLabelText('Slide 2').getAttribute('aria-current')).toBe('true');
    expect(getByLabelText('Slide 1').getAttribute('aria-current')).toBeNull();
    const current = Array.from(track.children).flatMap((slide, index) =>
      slide.classList.contains('is-current') ? [index] : []
    );
    expect(current).toEqual([1, 4, 7]);
  });

  it('jumps to the same banner in the middle copy once the row is still', () => {
    vi.useFakeTimers();
    const { container } = render(<PhotosSlider data={{ items }} />);
    const track = layOut(container);

    scrollRowTo(track, 600);
    scrollTo.mockClear();
    act(() => vi.advanceTimersByTime(100));
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'instant' });
  });

  it('does not jump when the row stops on a middle copy', () => {
    vi.useFakeTimers();
    const { container } = render(<PhotosSlider data={{ items }} />);
    const track = layOut(container);

    scrollRowTo(track, 400);
    scrollTo.mockClear();
    act(() => vi.advanceTimersByTime(300));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('waits for the finger to lift before jumping', () => {
    vi.useFakeTimers();
    const { container } = render(<PhotosSlider data={{ items }} />);
    const track = layOut(container);

    fireEvent.touchStart(track);
    scrollRowTo(track, 800);
    scrollTo.mockClear();
    act(() => vi.advanceTimersByTime(300));
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.touchEnd(track);
    act(() => vi.advanceTimersByTime(300));
    expect(scrollTo).toHaveBeenCalledWith({ left: 500, behavior: 'instant' });
  });

  it('waits for a mouse drag to end before jumping, and swallows its click', () => {
    vi.useFakeTimers();
    const { container } = render(<PhotosSlider data={{ items }} />);
    const track = layOut(container);

    fireEvent.pointerDown(track, { pointerType: 'mouse', button: 0, clientX: 200 });
    fireEvent.pointerMove(track, { clientX: 120 });
    expect(track.classList.contains('is-dragging')).toBe(true);
    scrollRowTo(track, 700);
    scrollTo.mockClear();
    act(() => vi.advanceTimersByTime(300));
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.pointerUp(track, { clientX: 120 });
    expect(track.classList.contains('is-dragging')).toBe(false);
    act(() => vi.advanceTimersByTime(300));
    expect(scrollTo).toHaveBeenCalledWith({ left: 400, behavior: 'instant' });
    expect(fireEvent.click(track)).toBe(false);
  });

  it('cancels the native image drag so a mouse drag on a photo scrolls the slider', () => {
    const { container } = render(<PhotosSlider data={{ items }} />);
    const img = container.querySelector('.s-photos-slider__slide img') as HTMLElement;
    expect(fireEvent.dragStart(img)).toBe(false);
  });

  describe('autoplay', () => {
    it('moves on when the current segment finishes filling', () => {
      const { container } = render(<PhotosSlider data={{ items }} />);
      const track = layOut(container);
      scrollRowTo(track, 300);
      scrollTo.mockClear();

      const fill = container.querySelector('.s-photos-stage__fill') as HTMLElement;
      expect(fill.closest('.s-photos-stage__segment')?.getAttribute('aria-current')).toBe('true');
      // React listens under whichever name the environment's styles suggest; jsdom's is prefixed.
      fireEvent(fill, new Event('webkitAnimationEnd', { bubbles: true }));
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
    });

    it('stops on the pause button and starts again on play', () => {
      const { container, getByLabelText } = render(<PhotosSlider data={{ items }} />);
      fireEvent.click(getByLabelText('Pause slides'));
      expect(container.querySelector('.s-photos-stage__fill')).toBeNull();
      expect(container.querySelector('.s-photos-stage')?.classList.contains('is-playing')).toBe(
        false
      );

      fireEvent.click(getByLabelText('Play slides'));
      expect(container.querySelector('.s-photos-stage__fill')).toBeTruthy();
    });

    it('can be switched off, which also takes the pause button away', () => {
      const { container, queryByLabelText } = render(
        <PhotosSlider data={{ items, auto_play: false }} />
      );
      expect(container.querySelector('.s-photos-stage__fill')).toBeNull();
      expect(queryByLabelText('Pause slides')).toBeNull();
    });

    it('does nothing with reduced motion', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query) => ({ matches: query.includes('reduced-motion'), media: query }) as MediaQueryList
      );
      const { container, queryByLabelText } = render(<PhotosSlider data={{ items }} />);
      expect(container.querySelector('.s-photos-stage__fill')).toBeNull();
      expect(queryByLabelText('Pause slides')).toBeNull();
    });

    it('holds while the block is off screen', () => {
      let report: (entries: { isIntersecting: boolean }[]) => void = () => {};
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback: typeof report) {
            report = callback;
          }
          observe() {}
          disconnect() {}
        }
      );
      const { container } = render(<PhotosSlider data={{ items }} />);
      const stage = container.querySelector('.s-photos-stage') as HTMLElement;
      act(() => report([{ isIntersecting: false }]));
      expect(stage.classList.contains('is-offscreen')).toBe(true);
      act(() => report([{ isIntersecting: true }]));
      expect(stage.classList.contains('is-offscreen')).toBe(false);
      vi.unstubAllGlobals();
    });
  });

  describe('banner shape', () => {
    function loaded(width: number, height: number) {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(width);
      vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(height);
      const { container } = render(<PhotosSlider data={{ items }} />);
      return (container.querySelector('.s-photos-stage') as HTMLElement).style.getPropertyValue(
        '--stage-ratio'
      );
    }

    it('takes the first banner’s shape', () => {
      expect(loaded(1200, 600)).toBe('2');
    });

    it('crops a sliver or a tower to a sensible shape', () => {
      expect(loaded(2000, 100)).toBe('3.5');
      cleanup();
      expect(loaded(300, 900)).toBe('1.2');
    });

    it('leaves the default until the banner has loaded', () => {
      expect(loaded(0, 0)).toBe('');
    });
  });
});
