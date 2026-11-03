// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

async function rules(): Promise<Map<string, string>> {
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/product.scss`);
  const { root } = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
  ]).process(css, {
    from: undefined,
  });
  const found = new Map<string, string>();
  root.walkRules((rule) => {
    const decls: string[] = [];
    rule.walkDecls(
      (d) => void decls.push(`${d.prop}: ${d.value}${d.important ? ' !important' : ''}`)
    );
    found.set(rule.selector.replace(/\s+/g, ' '), decls.join('; '));
  });
  return found;
}

describe('horizontal product card image', () => {
  it("keeps the photo's own shape without the store's unified image height, as Twig does", async () => {
    const css = await rules();
    const box =
      '.s-product-card-horizontal:not(.s-product-card-fit-height, .featured-products__column-body *) .s-product-card-image:has(img)';
    expect(css.get(box)).toBe('aspect-ratio: auto');
    expect(css.get(`${box} [style*=aspect-ratio]`)).toBe('aspect-ratio: auto !important');
    expect(css.get(`${box} img`)).toBe('height: auto');
  });

  it('fills the unified-height box with the photo', async () => {
    const css = await rules();
    expect(
      css.get('.s-product-card-horizontal.s-product-card-fit-height .s-product-card-image')
    ).toBe('aspect-ratio: auto');
  });
});
