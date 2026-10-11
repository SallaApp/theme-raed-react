import type { MouseEvent } from 'react';
import { SallaUserMenu } from '@salla.sa/twilight-components-react/user-menu';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { BottomSheet } from '../common/BottomSheet';
import { useCloseOnDesktop } from '../../hooks/useCloseOnDesktop';
import { useStaggeredRows } from '../../hooks/useStaggeredRows';

interface UserMenuSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen sheet mirroring the desktop header's `<salla-user-menu>`
 * dropdown (notifications / orders / pending orders / wishlist / wallet /
 * loyalty points / profile / settings / logout, each gated on the same store
 * features the desktop dropdown itself checks) — opened from the More
 * sheet's own "Account" row ({@link MobileAccountSheet}), as a second sheet
 * rather than a drill-in within the first (same pattern
 * {@link ImportantLinksSheet} uses).
 *
 * Renders `<salla-user-menu inline>` rather than a hand-built row list: an
 * earlier version of this sheet built its own rows and missed loyalty
 * points entirely, since which items show is store-feature-gated inside the
 * component (loyalty, wallet, Salla Account settings) with no equivalent
 * check exposed to theme code. `inline` is the component's own "list only,
 * no dropdown/trigger chrome" mode -- the same items the desktop dropdown
 * shows, just without its avatar trigger or positioning, which this sheet
 * doesn't need (the sheet itself is the opened state). Logout and every
 * item's href (including pending orders, which a hand-built version of this
 * had to special-case against losing its `?status=pending` filter) are
 * handled inside the component too, matching desktop exactly. Styling:
 * `04-components/mobile-account-sheet.scss`.
 */
export function UserMenuSheet({ open, onClose }: UserMenuSheetProps) {
  const { t } = useTranslation();

  useCloseOnDesktop(open, onClose);
  // Same staggered row entrance as ImportantLinksSheet.
  const rowsIn = useStaggeredRows(
    open,
    '.user-menu-sheet__menu',
    '.user-menu-sheet__menu .s-user-menu-dropdown-item'
  );

  // A link to the current page doesn't change the route, which is what closes the sheet otherwise.
  const closeOnLink = (e: MouseEvent) => {
    if ((e.target as Element).closest('a[href]:not([target="_blank"])')) onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('common.titles.account', 'Account')}
      className="user-menu-sheet"
    >
      <div role="presentation" onClick={closeOnLink}>
        <SallaUserMenu
          inline
          className={`user-menu-sheet__menu${rowsIn ? ' is-in' : ''}`}
          suppressHydrationWarning
        />
      </div>
    </BottomSheet>
  );
}
