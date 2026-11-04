import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { product as productApi, parseNextPageToken } from '@salla.sa/twilight-theme-engine/api/product';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { swapProductId, type StaticVariantMatch, type StaticVariantProduct } from '../lib/staticVariants';
import { buildVariantRows, readVariantInfo, type VariantProductLike, type VariantRow } from '../lib/tagVariants';

/** A group is a few dozen products; stop well before a runaway list. */
const PER_PAGE = 50;
const MAX_PAGES = 6;

async function fetchGroup(tagId: number, signal?: AbortSignal): Promise<Product[]> {
  const items: Product[] = [];
  let token: ReturnType<typeof parseNextPageToken> = {};
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await productApi.list({
      source: 'tags',
      sourceValue: [tagId],
      perPage: PER_PAGE,
      ...token,
      signal,
    });
    items.push(...result.items);
    if (!result.next) break;
    token = parseNextPageToken(result.next);
  }
  return items;
}

export interface TagVariantsState {
  /** True when the product has a group tag, so the selector should take its place. */
  active: boolean;
  /** True until the group's products have loaded. */
  loading: boolean;
  rows: VariantRow<VariantProductLike>[];
  /** The product's own rows while loading: from its static entry or its tags. */
  current: ReturnType<typeof readVariantInfo>;
}

/**
 * The option rows for a product linked to others (see `lib/tagVariants.ts`).
 *
 * A product listed in the static data (`lib/staticVariants.ts`, matched by the
 * product route's loader) gets its rows at once, on the server too, and its buttons swap the id in the current URL.
 * Otherwise the group named by its `مجموعة:` tag is fetched in the browser.
 */
export function useTagVariants(
  current: Product,
  staticMatch: StaticVariantMatch | null,
  /** A product of the group being opened: draw its rows now, before it loads. */
  previewId: number | null = null
): TagVariantsState {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const info = useMemo(() => readVariantInfo(current.tags), [current.tags]);
  const tagId = staticMatch ? null : (info?.group.tagId ?? null);

  const { data, isPending } = useQuery({
    queryKey: ['tag-variants', tagId],
    queryFn: ({ signal }) => fetchGroup(tagId!, signal),
    enabled: tagId !== null,
    staleTime: 5 * 60_000,
  });

  const staticRows = useMemo(() => {
    if (!staticMatch) return null;
    const withUrl = (p: StaticVariantProduct): VariantProductLike => ({ ...p, url: swapProductId(pathname, p.id) });
    const members = staticMatch.members.map(withUrl);
    const shown = members.find((m) => m.id === previewId) ?? withUrl(staticMatch.current);
    return buildVariantRows(shown, members);
  }, [staticMatch, pathname, previewId]);

  const tagRows = useMemo(() => {
    if (!data) return [];
    const shown = data.find((p) => p.id === previewId) ?? current;
    return buildVariantRows<VariantProductLike>(shown, data);
  }, [current, data, previewId]);

  if (staticRows) {
    return { active: true, loading: false, rows: staticRows, current: readVariantInfo(staticMatch!.current.tags) };
  }
  if (!info || tagId === null) return { active: false, loading: false, rows: [], current: null };
  return { active: true, loading: isPending, rows: tagRows, current: info };
}
