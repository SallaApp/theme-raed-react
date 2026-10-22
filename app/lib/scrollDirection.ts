/**
 * The `scrollLeft` sign of "forward" in a horizontal scroller: `1` in LTR, `-1`
 * in RTL, where the row runs from the right and scrolls towards negative
 * `scrollLeft`.
 */
export function forwardSign(el: HTMLElement): 1 | -1 {
  return getComputedStyle(el).direction === 'rtl' ? -1 : 1;
}
