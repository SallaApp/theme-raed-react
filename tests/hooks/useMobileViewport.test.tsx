import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useMobileViewport } from '../../app/hooks/useMobileViewport';

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
    const mql = new FakeMediaQueryList('(max-width: 767px)', true);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { getByTestId } = render(<Probe onRender={() => {}} />);
    expect(getByTestId('value').textContent).toBe('true');
  });

  it('starts false when the query does not match', () => {
    originalMatchMedia = window.matchMedia;
    const mql = new FakeMediaQueryList('(max-width: 767px)', false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { getByTestId } = render(<Probe onRender={() => {}} />);
    expect(getByTestId('value').textContent).toBe('false');
  });

  it('updates when the breakpoint changes', () => {
    originalMatchMedia = window.matchMedia;
    const mql = new FakeMediaQueryList('(max-width: 767px)', false);
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
    const mql = new FakeMediaQueryList('(max-width: 767px)', false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { unmount } = render(<Probe onRender={() => {}} />);
    expect(mql.listenerCount).toBe(1);

    unmount();
    expect(mql.listenerCount).toBe(0);
  });
});
