import { describe, it, expect } from 'vitest';
import { createStaticVariants, loadStaticVariants, swapProductId, type StaticVariantGroup } from '../../app/lib/staticVariants';
import { buildVariantRows } from '../../app/lib/tagVariants';
import { GLIZER_VARIANT_ALIASES, GLIZER_VARIANT_GROUPS } from '../../app/lib/glizer/variantData';

const groups: StaticVariantGroup[] = [
  {
    name: 'ايتونز',
    keys: ['المتجر', 'الفئة'],
    members: [
      [1, 'سعودي', '50 ريال'],
      [2, 'سعودي', '100 ريال'],
      [3, 'أمريكي', '10 دولار'],
    ],
  },
];

describe('createStaticVariants', () => {
  const lookup = createStaticVariants(groups, { 9: 2 });

  it('finds a product by id and builds rows from its group', () => {
    const match = lookup(1)!;
    const rows = buildVariantRows(match.current, match.members);
    expect(rows.map((r) => [r.key, r.options.map((o) => o.label)])).toEqual([
      ['المتجر', ['أمريكي', 'سعودي']],
      ['الفئة', ['50 ريال', '100 ريال']],
    ]);
    expect(rows[1].options[1].target?.id).toBe(2);
  });

  it('accepts string ids and shows an alias with its twin’s values', () => {
    expect(lookup('3')?.current.id).toBe(3);
    const alias = lookup(9)!;
    expect(alias.current.id).toBe(9);
    const rows = buildVariantRows(alias.current, alias.members);
    expect(rows[1].options.find((o) => o.selected)?.label).toBe('100 ريال');
  });

  it('is null for unknown ids', () => {
    expect(lookup(404)).toBeNull();
    expect(lookup(undefined)).toBeNull();
  });
});

describe('swapProductId', () => {
  it('replaces the trailing product id and keeps the rest', () => {
    expect(swapProductId('/ar/itunes-50/p123', 456)).toBe('/ar/itunes-50/p456');
    expect(swapProductId('/x/p123/', 456)).toBe('/x/p456');
    expect(swapProductId('/ar/cart', 456)).toBeNull();
  });
});

describe('Glizer data', () => {
  it('has one value per key and no repeated combination within a group', () => {
    const seen = new Set<number>();
    for (const group of GLIZER_VARIANT_GROUPS) {
      const combos = new Set<string>();
      for (const [id, ...values] of group.members) {
        expect(values).toHaveLength(group.keys.length);
        expect(seen.has(Number(id))).toBe(false);
        seen.add(Number(id));
        combos.add(values.join('|'));
      }
      expect(combos.size).toBe(group.members.length);
    }
    for (const [alias, target] of Object.entries(GLIZER_VARIANT_ALIASES)) {
      expect(seen.has(Number(alias))).toBe(false);
      expect(seen.has(target)).toBe(true);
    }
  });

  it('knows the dev product (iTunes Saudi 50)', async () => {
    const match = await loadStaticVariants(1869468748);
    expect(match?.current.tags.map((t) => t.name)).toEqual([
      'مجموعة:بطاقة ايتونز ابل ستور',
      'المتجر:سعودي',
      'الفئة:50 ريال',
    ]);
  });

  it('every product can reach every other product of its group', () => {
    for (const group of GLIZER_VARIANT_GROUPS) {
      const lookup = createStaticVariants([group]);
      const reached = new Set<number>();
      for (const [id] of group.members) {
        const match = lookup(id)!;
        for (const row of buildVariantRows(match.current, match.members)) {
          for (const option of row.options) if (option.target) reached.add(option.target.id);
        }
      }
      expect(reached.size, group.name).toBe(group.members.length);
    }
  });
});
