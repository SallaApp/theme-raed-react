// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type Root } from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

async function compile(file: string): Promise<Root> {
  const { css } = sass.compile(`${themeRoot}app/styles/${file}`);
  const result = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
  ]).process(css, { from: undefined });
  return result.root;
}

/** Every declaration of the rules for exactly `selector`, as `prop: value`. */
function declsFor(root: Root, selector: string): Record<string, string> {
  const decls: Record<string, string> = {};
  root.walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) return;
    rule.each((node) => {
      if (node.type === 'decl') decls[node.prop] = node.value;
    });
  });
  return decls;
}

describe('direction-aware styles', () => {
  // Arabic renders as before; English mirrors it.
  it('lays the order-page tooltip out from the inline start, with the close button at the end', async () => {
    const root = await compile('02-generic/tooltip.scss');

    const content = declsFor(root, '.tooltip-content');
    expect(content['text-align']).toBe('start');
    expect(content.padding).toBe('15px');
    expect(content['padding-inline-end']).toBe('36px');

    const close = declsFor(root, '.close-tooltip');
    expect(close['inset-inline-end']).toBe('0');
    expect(close.left).toBeUndefined();
  });

  // The label starts toward the end side, in RTL as in LTR.
  it('slides the bottom bar label in toward its icon in RTL too', async () => {
    const root = await compile('04-components/mobile-bottom-bar.scss');

    expect(declsFor(root, '.mobile-bottom-bar__label').transform).toBe('translateX(4px)');
    // `:where` adds no weight, so the active state and reduced motion still reset it.
    expect(declsFor(root, '.mobile-bottom-bar__label:where([dir=rtl] *)').transform).toBe(
      'translateX(-4px)'
    );
  });

  // Arabic renders as before; English mirrors it, as the star counts already do.
  it('keeps the review percentages next to their bars', async () => {
    const root = await compile('04-components/reviews.scss');

    expect(
      declsFor(root, '.s-comments-product .s-reviews-summary-percentage')['text-align']
    ).toBe('start');
  });
});
