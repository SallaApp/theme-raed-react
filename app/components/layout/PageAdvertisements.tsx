import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import {
  advertisement,
  advertisementsFor,
  type Advertisement,
} from '@salla.sa/twilight-theme-engine/api/advertisement';
import { whenSallaReady } from '@salla.sa/twilight-theme-engine/utils';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';

/** The key `<salla-advertisement>` marks a closed ad with, through `salla.storage` (store.js, JSON). */
const dismissedKey = (id: number) => `statusAd-${id}`;

/** Stable while the query has no data, so the effect below doesn't rerun on every render. */
const NO_ADS: Advertisement[] = [];

/** Hides the ads this visitor closed before the first paint; the effect then drops them. */
const HIDE_DISMISSED_SCRIPT =
  "(function(){try{if(window.self!==window.top)return;document.currentScript.parentNode.querySelectorAll('.s-advertisement[data-id]').forEach(function(e){if(localStorage.getItem('statusAd-'+e.getAttribute('data-id')))e.hidden=true})}catch(e){}})();";

function isDismissed(id: number): boolean {
  try {
    return Boolean(window.localStorage.getItem(dismissedKey(id)));
  } catch {
    return false;
  }
}

function dismiss(id: number): void {
  const storage = window.salla?.storage;
  if (typeof storage?.set === 'function') storage.set(dismissedKey(id), 'dismissed');
  else {
    try {
      window.localStorage.setItem(dismissedKey(id), JSON.stringify('dismissed'));
    } catch {
      // Storage disabled: the ad hides for this page view only.
    }
  }
}

interface ClientView {
  /** The theme editor's iframe, or the SDK's debug flag: closed ads show again. */
  preview: boolean;
  /** Inside the Salla mobile app, which shows no ads. */
  inApp: boolean;
  dismissed: Set<number>;
}

/**
 * The merchant's announcement bars (`s-advertisement`), rendered by the header.
 *
 * Fork of the engine `PageAdvertisements` — same data, markup and rules, except
 * that the theme editor preview keeps the merchant's page choice. The engine (like
 * Twig's `<salla-advertisement>`) shows every ad on every page in preview, so an
 * ad set for the home page and cart also showed on the product page there. Preview
 * still ignores "closed", so the merchant always sees the ads a page will show.
 *
 * The page slug comes from the deepest route loader's `page`, the same source the
 * engine syncs into its context, read from the router so it follows navigation.
 *
 * Upgrade notes: `FORKS.md`.
 */
export function PageAdvertisements() {
  const { t } = useTranslation();
  const pageSlug = useRouterState({
    select: (s) =>
      s.matches.reduceRight<string | undefined>(
        (found, match) =>
          found ?? (match.loaderData as { page?: { slug?: string } } | undefined)?.page?.slug,
        undefined
      ),
  });
  // The query's `retry: 0` only bounds the server wait; the browser may retry.
  const { data: ads = NO_ADS } = useQuery({ ...advertisement.queries.list(), retry: 2 });
  const [view, setView] = useState<ClientView | null>(null);

  useEffect(() => {
    const dismissed = new Set(ads.filter((ad) => isDismissed(ad.id)).map((ad) => ad.id));
    setView({ preview: window.self !== window.top, inApp: false, dismissed });
    return whenSallaReady((sdk) => {
      const config = sdk.config as { isMobileApp?: () => boolean; isDebug?: () => boolean };
      const inApp = Boolean(config?.isMobileApp?.());
      const debug = Boolean(config?.isDebug?.());
      if (inApp || debug) {
        setView((current) =>
          current ? { ...current, inApp, preview: current.preview || debug } : current
        );
      }
    });
  }, [ads]);

  if (view?.inApp) return null;
  const shown = advertisementsFor(ads, pageSlug).filter(
    (ad) => view?.preview || !view?.dismissed.has(ad.id)
  );
  if (!shown.length) return null;

  const close = (id: number) => {
    dismiss(id);
    setView((current) =>
      current ? { ...current, dismissed: new Set(current.dismissed).add(id) } : current
    );
  };

  return (
    <>
      {shown.map((ad) => (
        <div
          key={ad.id}
          className="s-advertisement"
          data-id={ad.id}
          style={{ backgroundColor: ad.colors?.bg, color: ad.colors?.text }}
        >
          <div className="s-advertisement-content container flex justify-between items-center py-2.5">
            <span className="s-advertisement-content-main flex-1 font-bold text-center text-sm">
              {/* Rendered without an icon too, as the SDK does: its margin is part of the layout. */}
              <i
                className={`s-advertisement-content-icon inline-block align-middle me-2 text-base ${ad.icon ?? ''}`}
              />
              {ad.url ? (
                <a
                  href={ad.url}
                  target={ad.target ?? undefined}
                  rel={ad.target === '_blank' ? 'noopener' : undefined}
                >
                  {ad.description}
                </a>
              ) : (
                ad.description
              )}
            </span>
            <button
              type="button"
              className="s-advertisement-action px-1"
              aria-label={t('common.buttons.close', 'Close')}
              onClick={() => close(ad.id)}
            >
              {/* `inline-block`: before the icon CSS loads, an empty inline `<i>` leaves the button 0px tall. */}
              <i className="sicon-cancel inline-block" />
            </button>
          </div>
        </div>
      ))}
      <script suppressHydrationWarning>{HIDE_DISMISSED_SCRIPT}</script>
    </>
  );
}
