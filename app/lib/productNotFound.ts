import { isNotFound, redirect as routerRedirect } from '@tanstack/react-router';
import { FALLBACK_LOCALE } from '@salla.sa/twilight-theme-engine/i18n';
import { redirect } from '@salla.sa/twilight-theme-engine/providers';
import { toast } from '@salla.sa/twilight-theme-engine/toast';
import themeTranslations from 'virtual:twilight/theme-translations';

/** Toast text when a product is hidden or gone; in `locales/{ar,en}.json`. */
export const PAGE_NOT_FOUND_KEY = 'pages.products.not_found';
const PAGE_NOT_FOUND_FALLBACK = 'Page not found';

/** The bundled theme translations (`virtual:twilight/theme-translations`): `{ 'ar.trans': {...}, 'en.trans': {...} }`. */
type ThemeTranslations = Record<string, Record<string, string>>;

/**
 * The not-found toast text in `locale`. A loader runs outside React, so it
 * can't use `useTranslation`; it reads the theme's own locale files instead.
 */
export function pageNotFoundMessage(
  locale: string | undefined,
  theme: ThemeTranslations = themeTranslations
): string {
  return (
    theme[`${locale || FALLBACK_LOCALE}.trans`]?.[PAGE_NOT_FOUND_KEY] ??
    theme[`${FALLBACK_LOCALE}.trans`]?.[PAGE_NOT_FOUND_KEY] ??
    PAGE_NOT_FOUND_FALLBACK
  );
}

/**
 * Call from a loader's `catch`. A hidden or deleted product (the API answers
 * 404 or 410, so the engine throws `notFound()`) sends the customer to the
 * home page with a "Page not found" toast instead of the 404 page. Any other
 * error is rethrown untouched.
 *
 * - On the server (a full page load) the message rides on `?danger=`: the
 *   engine's Toaster shows it once when it mounts, then strips it from the URL.
 * - In the browser (in-app navigation) the Toaster is already mounted and no
 *   longer reads `?danger=`, so the toast is shown directly.
 * - A hover preload rethrows: no toast and no redirect until the customer
 *   actually opens the link.
 */
export function redirectHomeIfNotFound(
  error: unknown,
  { locale, preload }: { locale?: string; preload?: boolean }
): never {
  if (preload || !isNotFound(error)) throw error;

  const home = `/${locale || FALLBACK_LOCALE}`;
  const message = pageNotFoundMessage(locale);

  if (typeof window === 'undefined') {
    throw routerRedirect({ href: `${home}?danger=${encodeURIComponent(message)}` });
  }

  toast.error(message);
  // Replace, so Back doesn't land on the missing product and bounce home again.
  return redirect(home, { replace: true });
}
