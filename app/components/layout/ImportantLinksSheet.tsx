import type { MouseEvent } from 'react';
import { SallaMenu } from '@salla.sa/twilight-components-react/menu';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { BottomSheet } from '../common/BottomSheet';
import { useCloseOnDesktop } from '../../hooks/useCloseOnDesktop';
import { useStaggeredRows } from '../../hooks/useStaggeredRows';

interface ImportantLinksSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen sheet for the footer menu ("important links") — opened from the
 * More sheet's own "Important links" row ({@link MobileAccountSheet}), as a
 * second sheet rather than a drill-in within the first.
 *
 * `<Footer inSheet>` skips its own footer menu (`FooterLinksMenu` returns
 * `null` for it), so this sheet owns the mobile footer links entirely — the
 * page footer keeps its own menu for desktop.
 * Styling: `04-components/mobile-account-sheet.scss`.
 */
export function ImportantLinksSheet({ open, onClose }: ImportantLinksSheetProps) {
  const { t } = useTranslation();

  useCloseOnDesktop(open, onClose);
  // Same staggered row entrance as HeaderNav's drawer gives its root links.
  const rowsIn = useStaggeredRows(
    open,
    '.important-links-sheet__menu',
    '.important-links-sheet__menu .s-menu-footer-item'
  );

  // A link to the current page doesn't change the route, which is what
  // closes the sheet otherwise -- same handler as MobileAccountSheet's own.
  const closeOnLink = (e: MouseEvent) => {
    if ((e.target as Element).closest('a[href]:not([target="_blank"])')) onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('blocks.footer.important_links', 'Important links')}
      className="important-links-sheet"
    >
      <div role="presentation" onClick={closeOnLink}>
        <SallaMenu
          source="footer"
          className={`important-links-sheet__menu${rowsIn ? ' is-in' : ''}`}
          suppressHydrationWarning
        />
      </div>
    </BottomSheet>
  );
}
