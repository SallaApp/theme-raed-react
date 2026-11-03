import { useCallback } from 'react';
import { useNavigate } from '@salla.sa/twilight-theme-engine/providers';

/**
 * A back button's action: the previous page, or the store's home when the tab
 * has no history (a link opened from WhatsApp, Instagram or a new tab). Home
 * goes through the engine's navigate, which keeps the shopper's language
 * (`/en`) and the store's base path; a plain `location.assign('/')` drops both.
 */
export function useGoBack() {
  const navigate = useNavigate();
  return useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else navigate('/');
  }, [navigate]);
}
