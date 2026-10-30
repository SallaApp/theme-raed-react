import { useEffect, useRef } from 'react';
import { SallaMetadata } from '@salla.sa/twilight-components-react/metadata';

interface ProductMetadataProps {
  /** Extra classes on the wrapper (used for the responsive show/hide). */
  className?: string;
}

/**
 * `<SallaMetadata>` (product specs) rendered as collapsible accordion groups.
 *
 * The web component emits static `.s-metadata-box` blocks — this wires
 * click-to-toggle on their `.s-metadata-box-header`s (adds `.is-open` on the
 * box; the open/closed styling lives in `04-components/metadata.scss`) and
 * opens the first group once it appears. A MutationObserver handles the async
 * spec fetch; the click handler is delegated so it survives re-renders.
 *
 * Rendered under the gallery slider on `md`+ ({@link ProductGallery}) and at the
 * end of the description on mobile ({@link ProductDetails}); the `className`
 * carries the `hidden md:block` / `md:hidden` toggle.
 *
 * The headers are plain `<div>`s, so each one also gets `role="button"`,
 * `tabindex="0"` and an `aria-expanded` that follows its box, and Enter / Space
 * toggle it — otherwise keyboard and screen-reader users can only read the
 * first group.
 *
 * The build's `no-manual-dom` check flags the `classList` / attribute calls.
 * They stay: the boxes are rendered by `<salla-metadata>`, not React, so there
 * is no ref or React state that reaches them.
 */
export function ProductMetadata({ className }: ProductMetadataProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncExpanded = (header: Element) =>
      header.setAttribute(
        'aria-expanded',
        String(!!header.parentElement?.classList.contains('is-open'))
      );

    // Runs on every change under the root: the specs arrive after an async fetch,
    // and the component can re-render its boxes.
    let opened = false;
    const setUp = () => {
      if (!opened) {
        const first = root.querySelector<HTMLElement>('.s-metadata-box');
        if (first) {
          first.classList.add('is-open');
          opened = true;
        }
      }
      root.querySelectorAll('.s-metadata-box-header').forEach((header) => {
        if (!header.hasAttribute('role')) {
          header.setAttribute('role', 'button');
          header.setAttribute('tabindex', '0');
        }
        syncExpanded(header);
      });
    };

    const observer = new MutationObserver(setUp);
    observer.observe(root, { childList: true, subtree: true });
    setUp();

    const headerOf = (event: Event) => {
      const header = (event.target as HTMLElement).closest('.s-metadata-box-header');
      return header && root.contains(header) ? header : null;
    };
    const toggle = (header: Element) => {
      header.parentElement?.classList.toggle('is-open');
      syncExpanded(header);
    };

    const onClick = (event: MouseEvent) => {
      const header = headerOf(event);
      if (header) toggle(header);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const header = headerOf(event);
      if (!header) return;
      // Space would otherwise scroll the page.
      event.preventDefault();
      toggle(header);
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeyDown);

    return () => {
      observer.disconnect();
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={`product-metadata${className ? ` ${className}` : ''}`}>
      <SallaMetadata />
    </div>
  );
}
