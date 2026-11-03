import { describe, it, expect } from 'vitest';
import {
  buildVariantRows,
  compareLabels,
  labelAmount,
  orderDimensions,
  parseVariantTag,
  productPath,
  readVariantInfo,
  sortLabels,
  tagIdOf,
  visibleTags,
  type VariantProductLike,
} from '../../app/lib/tagVariants';

let nextId = 1;
function product(group: string, values: Record<string, string>, extra: Partial<VariantProductLike> = {}) {
  const id = nextId++;
  return {
    id,
    url: `https://glizer-store.com/ar/item-${id}/p${id}`,
    tags: [
      { id: 900, name: `مجموعة:${group}`, url: 'https://glizer-store.com/x/tag-900' },
      ...Object.entries(values).map(([k, v]) => ({ name: `${k}:${v}`, url: null })),
    ],
    ...extra,
  };
}

/** The rows as text: `[selected]`, `label(x)` for disabled. */
function render(rows: ReturnType<typeof buildVariantRows>) {
  return rows.map(
    (row) =>
      `${row.key}: ${row.options
        .map((o) => (o.selected ? `[${o.label}]` : o.target ? o.label : `${o.label}(x)`))
        .join(', ')}`
  );
}

describe('parseVariantTag', () => {
  it('splits at the first colon and trims', () => {
    expect(parseVariantTag(' الفئة : 50 ريال ')).toEqual({ key: 'الفئة', value: '50 ريال' });
    expect(parseVariantTag('a:b:c')).toEqual({ key: 'a', value: 'b:c' });
  });

  it('accepts the full-width colon', () => {
    expect(parseVariantTag('المتجر：سعودي')).toEqual({ key: 'المتجر', value: 'سعودي' });
  });

  it('ignores plain tags and empty sides', () => {
    expect(parseVariantTag('عروض')).toBeNull();
    expect(parseVariantTag(':x')).toBeNull();
    expect(parseVariantTag('x: ')).toBeNull();
    expect(parseVariantTag(undefined)).toBeNull();
  });
});

describe('tagIdOf', () => {
  it('uses the id, else the URL', () => {
    expect(tagIdOf({ id: 5, name: 'x' })).toBe(5);
    expect(tagIdOf({ name: 'x', url: 'https://s.com/ar/summer/tag-88' })).toBe(88);
    expect(tagIdOf({ name: 'x', url: '/tags/42?x=1' })).toBe(42);
    expect(tagIdOf({ name: 'x', url: null })).toBeNull();
  });
});

describe('readVariantInfo / visibleTags', () => {
  const tags = [
    { name: 'عروض', url: '/tags/1' },
    { id: 7, name: 'مجموعة:ايتونز', url: '/tags/7' },
    { name: 'الفئة:50 ريال', url: '/tags/8' },
  ];

  it('reads the group and values', () => {
    expect(readVariantInfo(tags)).toEqual({
      group: { name: 'ايتونز', tagId: 7 },
      values: { الفئة: '50 ريال' },
      keys: ['الفئة'],
    });
  });

  it('is null without a group tag', () => {
    expect(readVariantInfo([{ name: 'الفئة:50 ريال', url: '' }])).toBeNull();
  });

  it('hides key:value tags only on grouped products', () => {
    expect(visibleTags(tags).map((t) => t.name)).toEqual(['عروض']);
    const ungrouped = [{ name: 'الفئة:50 ريال', url: '' }];
    expect(visibleTags(ungrouped)).toBe(ungrouped);
  });
});

describe('ordering', () => {
  it('reads amounts with K / M and Arabic digits', () => {
    expect(labelAmount('325 شدة')).toBe(325);
    expect(labelAmount('بارشيس لودو المتجر العالمي 12K gem')).toBe(12_000);
    expect(labelAmount('1.55M gem')).toBe(1_550_000);
    expect(labelAmount('٥٠ ريال')).toBe(50);
    expect(labelAmount('55 RC')).toBe(55);
    expect(labelAmount('K gem')).toBeNull();
  });

  it('sorts smallest first, numbers before text', () => {
    expect(['1.55M gem', '155K gem', '12K gem'].sort(compareLabels)).toEqual(['12K gem', '155K gem', '1.55M gem']);
    expect(['الذهب', '10', '5'].sort(compareLabels)).toEqual(['5', '10', 'الذهب']);
  });

  it('puts cash before instalments', () => {
    expect(sortLabels('طريقة الدفع', ['تقسيط', 'كاش'])).toEqual(['كاش', 'تقسيط']);
  });

  it('orders known rows first', () => {
    expect(orderDimensions(['طريقة الدفع', 'اللون', 'الفئة', 'شحن'])).toEqual(['شحن', 'الفئة', 'طريقة الدفع', 'اللون']);
  });
});

describe('buildVariantRows', () => {
  it('store + denomination: other stores’ denominations are hidden, switching store lands on its first', () => {
    const sa50 = product('ايتونز', { المتجر: 'سعودي', الفئة: '50 ريال' });
    const sa100 = product('ايتونز', { المتجر: 'سعودي', الفئة: '100 ريال' });
    const us10 = product('ايتونز', { المتجر: 'أمريكي', الفئة: '10 دولار' });
    const us4 = product('ايتونز', { المتجر: 'أمريكي', الفئة: '4 دولار' });
    const group = [sa50, sa100, us10, us4];

    const rows = buildVariantRows(sa50, group);
    expect(render(rows)).toEqual(['المتجر: أمريكي, [سعودي]', 'الفئة: [50 ريال], 100 ريال']);
    expect(rows[0].options[0].target).toBe(us4);
    expect(rows[1].options[1].target).toBe(sa100);
  });

  it('denomination + payment: a missing payment shows disabled, a denomination keeps the payment when it can', () => {
    const a = product('ببجي', { الفئة: '325 شدة', 'طريقة الدفع': 'كاش' });
    const b = product('ببجي', { الفئة: '325 شدة', 'طريقة الدفع': 'تقسيط' });
    const c = product('ببجي', { الفئة: '1320 شدة', 'طريقة الدفع': 'تقسيط' });
    const group = [a, b, c];

    expect(render(buildVariantRows(c, group))).toEqual([
      'الفئة: 325 شدة, [1320 شدة]',
      'طريقة الدفع: كاش(x), [تقسيط]',
    ]);
    const rows = buildVariantRows(c, group);
    expect(rows[0].options[0].target).toBe(b);
    // From cash, 1320 exists only as instalments: still reachable.
    expect(buildVariantRows(a, group)[0].options[1].target).toBe(c);
  });

  it('drops products of other groups (an unknown tag id lists every product)', () => {
    const a = product('ايتونز', { الفئة: '50 ريال' });
    const b = product('ايتونز', { الفئة: '100 ريال' });
    const other = product('بلايستيشن', { الفئة: '20 دولار' });
    const plain = { id: 999, url: '/p999', tags: [] };
    expect(render(buildVariantRows(a, [a, b, other, plain]))).toEqual(['الفئة: [50 ريال], 100 ريال']);
  });

  it('shows nothing for a product alone in its group or without a group', () => {
    const a = product('وحيد', { الفئة: '1' });
    expect(buildVariantRows(a, [a])).toEqual([]);
    expect(buildVariantRows({ id: 1, tags: [] }, [a])).toEqual([]);
  });
});

describe('productPath', () => {
  it('keeps the path and query of an absolute URL', () => {
    expect(productPath('https://glizer-store.com/ar/itunes/p123?x=1')).toBe('/ar/itunes/p123?x=1');
    expect(productPath('/en/x/p1')).toBe('/en/x/p1');
    expect(productPath(null)).toBeNull();
  });
});
