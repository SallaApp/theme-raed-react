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
 */
export function ProductMetadata({ className }: ProductMetadataProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let opened = false;
    const openFirst = () => {
      if (opened) return;
      const first = root.querySelector<HTMLElement>('.s-metadata-box');
      if (!first) return;
      first.classList.add('is-open');
      opened = true;
      observer.disconnect();
    };

    const observer = new MutationObserver(openFirst);
    observer.observe(root, { childList: true, subtree: true });
    openFirst();

    const onClick = (event: MouseEvent) => {
      const header = (event.target as HTMLElement).closest('.s-metadata-box-header');
      if (header && root.contains(header)) {
        header.parentElement?.classList.toggle('is-open');
      }
    };
    root.addEventListener('click', onClick);

    return () => {
      observer.disconnect();
      root.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`product-metadata${className ? ` ${className}` : ''}`}>
      <SallaMetadata />
    </div>
  );
}
