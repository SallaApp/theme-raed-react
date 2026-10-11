/**
 * Runs `callback` two animation frames from now, returning a canceller.
 *
 * A single `requestAnimationFrame` isn't enough to trigger a CSS transition on
 * mount: setting up the closed styles and flipping to the open ones both land
 * before the browser's *next* paint, so it never actually paints the starting
 * position and there's nothing to transition from. Waiting a full extra frame
 * guarantees that paint happens first.
 */
export function afterNextPaint(callback: () => void): () => void {
  let raf2 = 0;
  const raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(callback);
  });
  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
  };
}
