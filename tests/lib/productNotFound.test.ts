import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isRedirect, notFound } from '@tanstack/react-router';

const { toastError, engineRedirect } = vi.hoisted(() => ({
  toastError: vi.fn(),
  engineRedirect: vi.fn((path: string, opts?: { replace?: boolean }) => {
    throw { engineRedirect: path, replace: opts?.replace };
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/toast', () => ({ toast: { error: toastError } }));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({ redirect: engineRedirect }));

import {
  PAGE_NOT_FOUND_KEY,
  pageNotFoundMessage,
  redirectHomeIfNotFound,
} from '../../app/lib/productNotFound';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

describe('pageNotFoundMessage', () => {
  it('is translated in both locale files', () => {
    expect((ar as Record<string, string>)[PAGE_NOT_FOUND_KEY]).toBeTruthy();
    expect((en as Record<string, string>)[PAGE_NOT_FOUND_KEY]).toBe('Page not found');
  });

  it('reads the locale, then the fallback locale, then English text', () => {
    const theme = { 'ar.trans': { [PAGE_NOT_FOUND_KEY]: 'AR' }, 'en.trans': { [PAGE_NOT_FOUND_KEY]: 'EN' } };
    expect(pageNotFoundMessage('en', theme)).toBe('EN');
    expect(pageNotFoundMessage(undefined, theme)).toBe('AR');
    expect(pageNotFoundMessage('fr', theme)).toBe('AR');
    expect(pageNotFoundMessage('en', {})).toBe('Page not found');
  });
});

describe('redirectHomeIfNotFound', () => {
  beforeEach(() => {
    toastError.mockClear();
    engineRedirect.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('rethrows any error that is not a not-found', () => {
    const error = new Error('500');
    expect(thrown(() => redirectHomeIfNotFound(error, { locale: 'en' }))).toBe(error);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('does nothing visible on a hover preload', () => {
    const error = notFound();
    expect(thrown(() => redirectHomeIfNotFound(error, { locale: 'en', preload: true }))).toBe(error);
    expect(toastError).not.toHaveBeenCalled();
    expect(engineRedirect).not.toHaveBeenCalled();
  });

  it('in the browser, toasts and replaces the URL with the home page', () => {
    const result = thrown(() => redirectHomeIfNotFound(notFound(), { locale: 'en' }));
    expect(toastError).toHaveBeenCalledWith('Page not found');
    expect(result).toEqual({ engineRedirect: '/en', replace: true });
  });

  it('uses the fallback locale when the URL has none', () => {
    thrown(() => redirectHomeIfNotFound(notFound(), {}));
    expect(engineRedirect).toHaveBeenCalledWith('/ar', { replace: true });
  });

  it('on the server, redirects home with the message in ?danger= for the Toaster', () => {
    vi.stubGlobal('window', undefined);
    const result = thrown(() => redirectHomeIfNotFound(notFound(), { locale: 'en' }));
    expect(isRedirect(result)).toBe(true);
    expect((result as { options: { href?: string } }).options.href).toBe('/en?danger=Page%20not%20found');
    expect(toastError).not.toHaveBeenCalled();
  });
});
