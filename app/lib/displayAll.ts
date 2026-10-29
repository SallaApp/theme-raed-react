/**
 * Whether a product block's "View All" link leads anywhere new. A `latest` block
 * that came back with fewer products than its limit (or, without a limit, with
 * no next page) already shows the store's whole catalog, so the link is dropped.
 */
export function showsDisplayAll(
  source: string | undefined,
  count: number,
  limit: number | undefined,
  next: string | null | undefined
): boolean {
  if (source !== 'latest') return true;
  return limit ? count >= limit : Boolean(next);
}
