/**
 * Static variants: option rows for products listed in a data file by Salla
 * product id, for stores that cannot tag every product (Glizer first: see
 * `glizer/variantData.ts`, generated from the merchant's Salla export).
 *
 * Each group is turned into the same `مجموعة:` / `key:value` tag shape the
 * tag-based variants use, so `buildVariantRows` applies one set of rules to
 * both. Product ids are unique across Salla, so another store's product never
 * matches.
 */
import { GROUP_KEY, type VariantProductLike } from './tagVariants';

export interface StaticVariantGroup {
  name: string;
  /** Row titles, in the order of each member's values. */
  keys: string[];
  /** `[productId, ...values]`, one value per key. */
  members: (string | number)[][];
}

export interface StaticVariantProduct extends VariantProductLike {
  /** Leaves the URL to the caller, which knows the current path. */
  url: null;
}

export interface StaticVariantMatch {
  current: StaticVariantProduct;
  members: StaticVariantProduct[];
}

function toProduct(group: StaticVariantGroup, member: (string | number)[], id = Number(member[0])) {
  return {
    id,
    url: null,
    tags: [
      { name: `${GROUP_KEY}:${group.name}` },
      ...group.keys.map((key, i) => ({ name: `${key}:${member[i + 1]}` })),
    ],
  } satisfies StaticVariantProduct;
}

/** Builds the id lookup for a list of groups; aliases share their target's values. */
export function createStaticVariants(groups: StaticVariantGroup[], aliases: Record<number, number> = {}) {
  const byId = new Map<number, { group: StaticVariantGroup; member: (string | number)[] }>();
  for (const group of groups) {
    for (const member of group.members) byId.set(Number(member[0]), { group, member });
  }
  const cache = new Map<StaticVariantGroup, StaticVariantProduct[]>();

  return function lookup(productId: number | string | null | undefined): StaticVariantMatch | null {
    const id = Number(productId);
    if (!Number.isFinite(id)) return null;
    const hit = byId.get(id) ?? byId.get(aliases[id]);
    if (!hit) return null;
    let members = cache.get(hit.group);
    if (!members) {
      members = hit.group.members.map((m) => toProduct(hit.group, m));
      cache.set(hit.group, members);
    }
    // An alias is shown as itself (selected) with its twin's values.
    return { current: toProduct(hit.group, hit.member, id), members };
  };
}

let lookup: ReturnType<typeof createStaticVariants> | null = null;

/**
 * The static group of a product, or null. The data is imported on first use so
 * only product pages load it; the product route calls this in its loader and
 * hands the result to the page, so server and browser render the same rows.
 */
export async function loadStaticVariants(productId: number | string): Promise<StaticVariantMatch | null> {
  if (!lookup) {
    const data = await import('./glizer/variantData');
    lookup = createStaticVariants(data.GLIZER_VARIANT_GROUPS, data.GLIZER_VARIANT_ALIASES);
  }
  return lookup(productId);
}

/** The current product path with its trailing `/p{id}` swapped; the slug is not used to find the product. */
export function swapProductId(pathname: string, id: number): string | null {
  const next = pathname.replace(/\/p\d+\/?$/, `/p${id}`);
  return next === pathname && !pathname.endsWith(`/p${id}`) ? null : next;
}
