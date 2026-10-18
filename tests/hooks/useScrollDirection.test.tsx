import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useScrollDirection } from '../../app/hooks/useScrollDirection';

let direction: string | undefined;

function Probe() {
  direction = useScrollDirection();
  return null;
}

/** Scroll the window to `y` and run the frame the hook waits for. */
function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
    vi.runAllTimers();
  });
}

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

describe('useScrollDirection', () => {
  it('starts up, follows the scroll, and ignores moves under the threshold', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    scrollTo(0);
    render(<Probe />);
    expect(direction).toBe('up');

    scrollTo(200);
    expect(direction).toBe('down');

    // A jitter back up of a few pixels doesn't flip it.
    scrollTo(195);
    expect(direction).toBe('down');

    scrollTo(120);
    expect(direction).toBe('up');

    scrollTo(300);
    expect(direction).toBe('down');
  });
});
