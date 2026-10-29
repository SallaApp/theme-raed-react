import { useQuery } from '@tanstack/react-query';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { pruneUntitled } from '../lib/menuOverflow';

/**
 * Whether the nav drawer (`HeaderNav`) has anything to show: the store's header
 * menu, or one of its footer switchers (language, branch, currency). Its triggers
 * hide when it would open empty. True until the menu loads, so they don't flash
 * out and back in on stores that have one.
 */
export function useNavHasContent(): boolean {
  const { store } = useTwilight();
  const { data: items, isSuccess } = useQuery(menu.queries.header());
  const hasSwitchers = Boolean(
    store?.settings?.is_multilingual || store?.scope || store?.settings?.currencies_enabled
  );
  return !isSuccess || hasSwitchers || pruneUntitled(items ?? []).length > 0;
}
