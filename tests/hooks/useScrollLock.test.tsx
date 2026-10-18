import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DocumentClassProvider } from '@salla.sa/twilight-theme-engine/providers';
import { useScrollLock } from '../../app/hooks/useScrollLock';

function Lock({ active }: { active: boolean }) {
  useScrollLock(active);
  return null;
}

/**
 * Overlays as the app has them: each one a lock, all under the one
 * DocumentClassProvider that TwilightProvider mounts. `null` is an overlay
 * that isn't mounted.
 */
function Overlays({ locks }: { locks: (boolean | null)[] }) {
  return (
    <DocumentClassProvider>
      {locks.map((active, index) =>
        // Fixed slots, so a lock keeps its identity across rerenders.
        // react-doctor-disable-next-line react-doctor/no-array-index-as-key
        active === null ? null : <Lock key={index} active={active} />
      )}
    </DocumentClassProvider>
  );
}

const locked = () => document.body.classList.contains('menu-opened');

afterEach(() => {
  cleanup();
  document.body.classList.remove('menu-opened');
});

describe('useScrollLock', () => {
  it('adds menu-opened while active', () => {
    render(<Overlays locks={[true]} />);
    expect(locked()).toBe(true);
  });

  it('never adds menu-opened while inactive', () => {
    render(<Overlays locks={[false]} />);
    expect(locked()).toBe(false);
  });

  it('removes menu-opened once the lock unmounts', () => {
    const { rerender } = render(<Overlays locks={[true]} />);
    expect(locked()).toBe(true);

    rerender(<Overlays locks={[null]} />);
    expect(locked()).toBe(false);
  });

  // The bug a shared lock prevents: two independent overlays (e.g.
  // ImportantLinksSheet and HeaderNav's drawer, switched between via the
  // bottom bar) each adding/removing the same class with no coordination --
  // one closing could remove it right as the other opened, leaving the page
  // scrollable behind a still-open overlay.
  it('keeps the lock while a second, independent caller is still active', () => {
    const { rerender } = render(<Overlays locks={[true, true]} />);
    expect(locked()).toBe(true);

    // The first caller closes -- the second is still open, so the lock must stay.
    rerender(<Overlays locks={[null, true]} />);
    expect(locked()).toBe(true);

    rerender(<Overlays locks={[null, null]} />);
    expect(locked()).toBe(false);
  });

  it("keeps the lock when one caller's active prop flips off while another stays active", () => {
    const { rerender } = render(<Overlays locks={[true, true]} />);
    expect(locked()).toBe(true);

    rerender(<Overlays locks={[false, true]} />);
    expect(locked()).toBe(true);

    rerender(<Overlays locks={[false, false]} />);
    expect(locked()).toBe(false);
  });
});
