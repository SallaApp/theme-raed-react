import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ArrowRightIcon } from '../icons';
import { HOME_ROUTE_ID, PRODUCT_ROUTE_ID } from '../../lib/routeIds';

type MaybePage = { page?: { title?: string } };
type Match = { routeId: string; loaderData?: unknown };

/** Deepest matched route that carries a `page.title` in its loader data. */
function routePageTitle(state: { matches: Match[] }): string | undefined {
  for (let i = state.matches.length - 1; i >= 0; i--) {
    const title = (state.matches[i].loaderData as MaybePage | undefined)?.page?.title;
    if (title) return title;
  }
  return undefined;
}

/** Route match state, in one selector so the bar re-renders once per navigation. */
function pageTitleState(state: { matches: Match[] }): {
  title?: string;
  isProductPage: boolean;
  isHomePage: boolean;
} {
  return {
    title: routePageTitle(state),
    isProductPage: state.matches.some((m) => m.routeId === PRODUCT_ROUTE_ID),
    isHomePage: state.matches.some((m) => m.routeId === HOME_ROUTE_ID),
  };
}

/** `<title>` minus the " | Store" / " - Store" suffix the head builder appends. */
function cleanDocumentTitle(): string {
  if (typeof document === 'undefined') return '';
  return document.title.split(/\s+[|–—-]\s+/)[0].trim();
}

/**
 * Mobile page-title bar — shown at the top of every route except the home page
 * and the product page (which run their own headers). The site header is
 * collapsed on mobile away from home (`04-components/header.scss`), so this is
 * what names the page. Styling: `04-components/mobile-page-title.scss`.
 *
 * Title comes from the matched route's `page.title` (set by the theme / engine
 * loaders — e.g. the cart loader returns `common.titles.cart`); falls back to
 * the document title with its store suffix trimmed.
 *
 * The home and product-page exclusions are decided here from route-match state (identical
 * on the server and the client, no timing gap) rather than only in CSS keyed
 * off the `body.index` / `body.product-single` classes — those are applied by a client
 * effect, so on first paint it isn't there yet and the bar would flash
 * visible before disappearing.
 */
export function MobilePageTitleBar() {
  const { t } = useTranslation();
  const {
    title: routeTitle,
    isProductPage,
    isHomePage,
  } = useRouterState({ select: pageTitleState });
  const [docTitle, setDocTitle] = useState('');

  useEffect(() => {
    setDocTitle(routeTitle ? '' : cleanDocumentTitle());
  }, [routeTitle]);

  if (isProductPage || isHomePage) return null;

  const title = routeTitle || docTitle;
  if (!title) return null;

  return (
    <div className="mobile-page-title">
      <button
        type="button"
        className="mobile-page-title__back"
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else window.location.assign('/');
        }}
        aria-label={t('blocks.header.back', 'Back')}
      >
        <ArrowRightIcon aria-hidden="true" />
      </button>
      <h1 className="mobile-page-title__text">{title}</h1>
    </div>
  );
}
