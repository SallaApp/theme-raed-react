import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { MOBILE_QUERY, useMobileViewport } from '../../app/hooks/useMobileViewport';

/** A real (event-capable) stand-in for `MediaQueryList` — the global polyfill
 * in `tests/setup.tsx` is a fixed `matches: true` stub with no-op listener
 * methods, which can't exercise a live breakpoint change. */
class FakeMediaQueryList {
  matches: boolean;
  media: string;
  private listeners = new Set<(e: { matches: boolean }) => void>();

  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }

  addEventListener(_type: 'change', cb: (e: { matches: boolean }) => void) {
    this.listeners.add(cb);
  }

  removeEventListener(_type: 'change', cb: (e: { matches: boolean }) => void) {
    this.listeners.delete(cb);
  }

  // Test helper: simulate the browser flipping the breakpoint.
  setMatches(matches: boolean) {
    this.matches = matches;
    this.listeners.forEach((cb) => cb({ matches }));
  }

  get listenerCount() {
    return this.listeners.size;
  }
}

/** Evaluates a `(min-width: Npx)` or `(max-width: Npx)` query, maybe `not all and`, at `width`. */
function matchesAt(query: string, width: number): boolean {
  const parsed = /^(not all and )?\((min|max)-width: ([\d.]+)px\)$/.exec(query);
  if (!parsed) throw new Error(`Unexpected query: ${query}`);
  const [, not, bound, px] = parsed;
  const inside = bound === 'min' ? width >= Number(px) : width <= Number(px);
  return not ? !inside : inside;
}

function Probe({ onRender }: { onRender: (isMobile: boolean) => void }) {
  const isMobile = useMobileViewport();
  onRender(isMobile);
  return <span data-testid="value">{String(isMobile)}</span>;
}

let originalMatchMedia: typeof window.matchMedia;

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

describe('useMobileViewport', () => {
  it('reflects the media query at mount', () => {
    originalMatchMedia = window.matchMedia;
    const mql = new FakeMediaQueryList(MOBILE_QUERY, true);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { getByTestId } = render(<Probe onRender={() => {}} />);
    expect(getByTestId('value').textContent).toBe('true');
  });

  it('starts false when the query does not match', () => {
    originalMatchMedia = window.matchMedia;
    const mql = new FakeMediaQueryList(MOBILE_QUERY, false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { getByTestId } = render(<Probe onRender={() => {}} />);
    expect(getByTestId('value').textContent).toBe('false');
  });

  it('updates when the breakpoint changes', () => {
    originalMatchMedia = window.matchMedia;
    const mql = new FakeMediaQueryList(MOBILE_QUERY, false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { getByTestId } = render(<Probe onRender={() => {}} />);
    expect(getByTestId('value').textContent).toBe('false');

    act(() => mql.setMatches(true));
    expect(getByTestId('value').textContent).toBe('true');

    act(() => mql.setMatches(false));
    expect(getByTestId('value').textContent).toBe('false');
  });

  it('removes its change listener on unmount', () => {
    originalMatchMedia = window.matchMedia;
    const mql = new FakeMediaQueryList(MOBILE_QUERY, false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { unmount } = render(<Probe onRender={() => {}} />);
    expect(mql.listenerCount).toBe(1);

    unmount();
    expect(mql.listenerCount).toBe(0);
  });

  it("is on wherever Tailwind's md: is off, fractional widths included", () => {
    // Browser zoom and display scaling give widths such as 767.5px. There the
    // `md:hidden` phone markup shows, so the hook must say "mobile" too.
    originalMatchMedia = window.matchMedia;
    for (const width of [767, 767.5, 767.98, 768, 768.5]) {
      window.matchMedia = vi.fn(
        (query: string) => new FakeMediaQueryList(query, matchesAt(query, width))
      ) as unknown as typeof window.matchMedia;

      const { getByTestId, unmount } = render(<Probe onRender={() => {}} />);
      const md = matchesAt('(min-width: 768px)', width);
      expect(getByTestId('value').textContent, `${width}px`).toBe(String(!md));
      unmount();
    }
  });
});
