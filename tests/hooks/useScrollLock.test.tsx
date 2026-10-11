import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useScrollLock } from '../../app/hooks/useScrollLock';

function Lock({ active }: { active: boolean }) {
  useScrollLock(active);
  return null;
}

afterEach(() => {
  cleanup();
  document.body.classList.remove('menu-opened');
});

describe('useScrollLock', () => {
  it('adds menu-opened while active', () => {
    render(<Lock active />);
    expect(document.body.classList.contains('menu-opened')).toBe(true);
  });

  it('never adds menu-opened while inactive', () => {
    render(<Lock active={false} />);
    expect(document.body.classList.contains('menu-opened')).toBe(false);
  });

  it('removes menu-opened once the lock unmounts', () => {
    const { unmount } = render(<Lock active />);
    expect(document.body.classList.contains('menu-opened')).toBe(true);

    unmount();
    expect(document.body.classList.contains('menu-opened')).toBe(false);
  });

  // The actual bug this hook fixes: two independent overlays (e.g.
  // ImportantLinksSheet and HeaderNav's drawer, switched between via the
  // bottom bar) each used to add/remove the same class with no coordination
  // -- one closing could remove it right as the other opened, leaving the
  // page scrollable behind a still-open overlay.
  it('keeps the lock while a second, independent caller is still active', () => {
    const a = render(<Lock active />);
    const b = render(<Lock active />);
    expect(document.body.classList.contains('menu-opened')).toBe(true);

    // The first caller closes -- the second is still open, so the lock must stay.
    a.unmount();
    expect(document.body.classList.contains('menu-opened')).toBe(true);

    b.unmount();
    expect(document.body.classList.contains('menu-opened')).toBe(false);
  });

  it("keeps the lock when one caller's active prop flips off while another stays active", () => {
    const { rerender } = render(<Lock active />);
    render(<Lock active />);
    expect(document.body.classList.contains('menu-opened')).toBe(true);

    rerender(<Lock active={false} />);
    expect(document.body.classList.contains('menu-opened')).toBe(true);
  });
});
