import { useRef } from 'react';
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';

const DRAG_THRESHOLD = 3;

/**
 * Click-and-drag horizontal scrolling for mouse / pen (touch keeps its native
 * momentum). Spread the returned handlers onto the scroll container.
 *
 * The pointer is captured only once the drag passes {@link DRAG_THRESHOLD}px.
 * Capturing on `pointerdown` retargets the follow-up `click` to the container,
 * so a click on a link / button inside a slide would never reach it — the
 * "similar products" cards became unclickable. Once a real drag happens,
 * `onClickCapture` swallows the trailing click so it doesn't activate a slide.
 */
export function useDragScroll(ref: RefObject<HTMLDivElement | null>) {
  const state = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
    pointerId: -1,
  });

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType === 'touch' || event.button !== 0) return;
    state.current = {
      active: true,
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: false,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !state.current.active) return;
    const delta = event.clientX - state.current.startX;

    if (!state.current.moved) {
      if (Math.abs(delta) <= DRAG_THRESHOLD) return;
      // A real drag started — capture the pointer now (not on pointerdown) so a
      // plain click still reaches whatever is under it.
      state.current.moved = true;
      el.setPointerCapture?.(state.current.pointerId);
      el.classList.add('is-dragging');
    }

    el.scrollLeft = state.current.startScroll - delta;
  };

  const endDrag = () => {
    const el = ref.current;
    if (!state.current.active) return;
    state.current.active = false;
    try {
      el?.releasePointerCapture?.(state.current.pointerId);
    } catch {
      /* pointer was never captured (plain click) */
    }
    el?.classList.remove('is-dragging');
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!state.current.moved) return;
    state.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  };

  // A native image/link drag would cancel the pointer stream, so the slider never moves.
  const onDragStart = (event: ReactDragEvent<HTMLDivElement>) => event.preventDefault();

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
    onDragStart,
  };
}
