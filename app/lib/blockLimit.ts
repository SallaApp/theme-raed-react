/**
 * A product block's `limit` (how many products the merchant chose to show), as
 * the home blocks API sends it: a number, or the same as a string. Undefined
 * when it isn't a positive whole number, so the block falls back to the API's
 * own page size.
 */
export function blockLimit(value: unknown): number | undefined {
  const limit = typeof value === 'string' ? Number(value.trim()) : value;
  return typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : undefined;
}
