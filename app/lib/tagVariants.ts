/**
 * Tag variants: show separate products as option buttons on one product page.
 *
 * Some stores (Glizer first) keep every denomination as its own Salla product
 * ("iTunes Saudi 50 SAR", "iTunes Saudi 100 SAR", ...) and do not use Salla
 * product options. The merchant links those products with `key:value` tags:
 *
 *   مجموعة:بطاقة ايتونز ابل ستور   <- the group; every product in it carries it
 *   المتجر:سعودي                    <- one tag per row of buttons
 *   الفئة:50 ريال
 *
 * The text before `:` is the row title, the text after it is the button label.
 * A product without the group tag is untouched.
 *
 * This file is pure (no React, no SDK), so the selection rules are unit-tested.
 */

/** Key of the tag that names the group. */
export const GROUP_KEY = 'مجموعة';

/** Rows that come first, in this order. Other rows follow in tag order. */
const DIMENSION_ORDER = ['شحن', 'المتجر', 'الفئة', 'طريقة الدفع'];

/** Rows whose buttons have a fixed order instead of smallest-first. */
const VALUE_ORDER: Record<string, string[]> = {
  'طريقة الدفع': ['كاش', 'تقسيط'],
};

/** The smallest tag shape this file needs: the engine's `ProductTag`. */
export interface VariantTagLike {
  id?: number;
  name: string;
  url?: string | null;
}

/** The smallest product shape this file needs. */
export interface VariantProductLike {
  id: number;
  url?: string | null;
  tags?: VariantTagLike[] | null;
  is_out_of_stock?: boolean;
}

export interface ParsedTag {
  key: string;
  value: string;
}

/** Splits `key:value` at the first colon (ASCII or Arabic-keyboard full-width). */
export function parseVariantTag(name: string | null | undefined): ParsedTag | null {
  if (!name) return null;
  const match = /^([^:：]+)[:：](.+)$/.exec(name.trim());
  if (!match) return null;
  const key = match[1].trim();
  const value = match[2].trim();
  return key && value ? { key, value } : null;
}

export interface ProductVariantInfo {
  /** The group tag. Its id is what the product list is fetched by. */
  group: { name: string; tagId: number | null };
  /** Row values of this product, by row title. */
  values: Record<string, string>;
  /** Row titles in the order the product's tags list them. */
  keys: string[];
}

/** Tag id from the tag itself, else from its URL (`/slug/tag-88` or `/tags/88`). */
export function tagIdOf(tag: VariantTagLike): number | null {
  if (typeof tag.id === 'number' && tag.id > 0) return tag.id;
  const match = /(?:\/tag-|\/tags\/)(\d+)(?:[/?#]|$)/.exec(tag.url ?? '');
  return match ? Number(match[1]) : null;
}

/** Reads the group and row values from a product's tags, or null when it has no group tag. */
export function readVariantInfo(tags: VariantTagLike[] | null | undefined): ProductVariantInfo | null {
  let group: ProductVariantInfo['group'] | null = null;
  const values: Record<string, string> = {};
  const keys: string[] = [];
  for (const tag of tags ?? []) {
    const parsed = parseVariantTag(tag.name);
    if (!parsed) continue;
    if (parsed.key === GROUP_KEY) {
      group ??= { name: parsed.value, tagId: tagIdOf(tag) };
    } else if (!(parsed.key in values)) {
      values[parsed.key] = parsed.value;
      keys.push(parsed.key);
    }
  }
  return group ? { group, values, keys } : null;
}

/** The tags to show to the customer: grouped products hide their `key:value` tags. */
export function visibleTags<T extends VariantTagLike>(tags: T[] | null | undefined): T[] {
  const list = tags ?? [];
  if (!readVariantInfo(list)) return list;
  return list.filter((tag) => !parseVariantTag(tag.name));
}

const ARABIC_DIGITS = /[٠-٩]/g;

/**
 * The amount a label stands for, so buttons sort by size: `50 ريال` → 50,
 * `12K gem` → 12000, `1.55M gem` → 1550000. Null when the label has no number.
 */
export function labelAmount(label: string): number | null {
  const text = label
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/(\d),(?=\d{3}\b)/g, '$1');
  const match = /(\d+(?:\.\d+)?)\s*([KkMm])?(?![a-zA-Z])/.exec(text) ?? /(\d+(?:\.\d+)?)/.exec(text);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2]?.toUpperCase();
  return unit === 'K' ? n * 1_000 : unit === 'M' ? n * 1_000_000 : n;
}

/** Labels with a number first, smallest first; then the rest alphabetically. */
export function compareLabels(a: string, b: string): number {
  const x = labelAmount(a);
  const y = labelAmount(b);
  if (x !== null && y !== null && x !== y) return x - y;
  if (x !== null && y === null) return -1;
  if (x === null && y !== null) return 1;
  return a.localeCompare(b, 'ar');
}

/** Sorts a row's labels: its fixed order first (see `VALUE_ORDER`), then {@link compareLabels}. */
export function sortLabels(key: string, labels: string[]): string[] {
  const fixed = VALUE_ORDER[key] ?? [];
  const rank = (label: string) => {
    const i = fixed.indexOf(label);
    return i === -1 ? fixed.length : i;
  };
  return [...labels].sort((a, b) => rank(a) - rank(b) || compareLabels(a, b));
}

/** Row titles in display order: the known ones first, then the rest as first seen. */
export function orderDimensions(keys: string[]): string[] {
  const unique = [...new Set(keys)];
  const rank = (k: string) => {
    const i = DIMENSION_ORDER.indexOf(k);
    return i === -1 ? DIMENSION_ORDER.length : i;
  };
  return unique
    .map((k, i) => ({ k, i }))
    .sort((a, b) => rank(a.k) - rank(b.k) || a.i - b.i)
    .map(({ k }) => k);
}

interface Member<P> {
  product: P;
  values: Record<string, string>;
}

export interface VariantOption<P> {
  label: string;
  selected: boolean;
  /** The product this button opens; null when no product has this value with the earlier choices. */
  target: P | null;
}

export interface VariantRow<P> {
  key: string;
  options: VariantOption<P>[];
}

const sameOn = (a: Record<string, string>, b: Record<string, string>, keys: string[]) =>
  keys.every((k) => a[k] === b[k]);

/**
 * True when a row's values mostly differ between the choices made in the rows
 * above it, like denominations per store (`50 ريال` vs `10 دولار`). Those
 * values are hidden when they don't apply. A row whose values repeat for every
 * choice above, like `كاش` / `تقسيط` per denomination, shows the missing ones
 * disabled instead.
 */
function isBranchRow<P>(members: Member<P>[], key: string, before: string[]): boolean {
  if (before.length === 0) return false;
  const sets = new Map<string, Set<string>>();
  for (const m of members) {
    const value = m.values[key];
    if (value === undefined) continue;
    const parent = before.map((k) => m.values[k] ?? '').join('\u0000');
    if (!sets.has(parent)) sets.set(parent, new Set());
    sets.get(parent)!.add(value);
  }
  const groups = [...sets.values()];
  if (groups.length < 2) return false;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const [a, b] = [groups[i], groups[j]];
      let shared = 0;
      for (const v of a) if (b.has(v)) shared++;
      total += shared / Math.min(a.size, b.size);
      pairs++;
    }
  }
  return total / pairs < 0.5;
}

/**
 * The product to open for `key = value`: it keeps every earlier row as chosen
 * (except for the first row, which can always change), and then matches as many
 * later rows as possible, earlier rows weighing more. Ties go to the smallest
 * later values, so switching store lands on its first denomination.
 */
function pickTarget<P>(
  members: Member<P>[],
  current: Record<string, string>,
  order: string[],
  index: number,
  value: string
): P | null {
  const key = order[index];
  const before = order.slice(0, index);
  const after = order.slice(index + 1);
  const candidates = members.filter((m) => m.values[key] === value && sameOn(m.values, current, before));
  if (candidates.length === 0) return null;
  const score = (m: Member<P>) => after.map((k) => (m.values[k] === current[k] ? 1 : 0));
  candidates.sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    for (let i = 0; i < after.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
    for (const k of after) {
      const c = compareLabels(a.values[k] ?? '', b.values[k] ?? '');
      if (c !== 0) return c;
    }
    return 0;
  });
  return candidates[0].product;
}

/**
 * Builds the rows of buttons for `current` from the products of its group.
 * Products of other groups (the list endpoint returns every product for an
 * unknown tag) are dropped. Returns no rows when the group has one product.
 */
export function buildVariantRows<P extends VariantProductLike>(current: P, siblings: P[]): VariantRow<P>[] {
  const info = readVariantInfo(current.tags);
  if (!info) return [];

  const byId = new Map<number, Member<P>>();
  for (const product of [current, ...siblings]) {
    if (byId.has(product.id)) continue;
    const other = readVariantInfo(product.tags);
    if (!other || other.group.name !== info.group.name) continue;
    byId.set(product.id, { product, values: other.values });
  }
  const members = [...byId.values()];
  if (members.length < 2) return [];

  const order = orderDimensions([info.keys, ...members.map((m) => Object.keys(m.values))].flat());
  const rows: VariantRow<P>[] = [];

  order.forEach((key, index) => {
    const before = order.slice(0, index);
    const labels = sortLabels(key, [
      ...new Set(members.map((m) => m.values[key]).filter((v): v is string => !!v)),
    ]);
    if (labels.length === 0) return;
    const branch = isBranchRow(members, key, before);
    const options: VariantOption<P>[] = [];
    for (const label of labels) {
      const target = pickTarget(members, info.values, order, index, label);
      if (!target && branch) continue;
      options.push({ label, selected: info.values[key] === label, target });
    }
    // A one-button row stays: it still tells the customer what they are buying.
    if (options.length > 0) rows.push({ key, options });
  });

  return rows;
}

/** The path of a product URL, so the router can open it without a full reload. */
export function productPath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'https://store.invalid');
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
