// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import * as sass from 'sass';
import postcss, { type Root } from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

/** Every declaration of the top-level rules for exactly `selector`, as `prop: value`. */
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

/** The index of the first top-level rule for `selector`, to compare source order. */
function ruleIndex(root: Root, selector: string) {
  return root.nodes.findIndex((node) => node.type === 'rule' && node.selectors.includes(selector));
}

let root: Root;

beforeAll(async () => {
  const { css } = sass.compile(`${themeRoot}app/styles/app.scss`);
  const result = await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(
    css,
    { from: undefined }
  );
  root = result.root;
});

// The strip scrolls sideways when the tabs don't fit (phones, long names). A
// centred (or end-aligned) row that overflows spills past its start edge too,
// and a scroller can't reach what is past its start: the first tab is cut off.
describe('featured products tab strip', () => {
  const tabs = '.s-block--featured-products .tabs';

  it('scrolls sideways', () => {
    expect(declsFor(root, tabs)['overflow-x']).toBe('auto');
  });

  it('centres the tabs with auto margins, not justify-content, so an overflow starts at the start edge', () => {
    expect(declsFor(root, tabs)['justify-content']).toBeUndefined();
    expect(declsFor(root, `${tabs} > .tab-trigger:first-child`)['margin-inline-start']).toBe(
      'auto'
    );
    expect(declsFor(root, `${tabs} > .tab-trigger:last-child`)['margin-inline-end']).toBe('auto');
  });

  it("keeps the centring margins over the tabbed style's space-x margins", () => {
    const spaceX = '.s-block--tabs-produtcs .tabs > :not([hidden]) ~ :not([hidden])';
    expect(ruleIndex(root, spaceX)).toBeGreaterThan(-1);
    expect(ruleIndex(root, `${tabs} > .tab-trigger:last-child`)).toBeGreaterThan(
      ruleIndex(root, spaceX)
    );
  });

  it('puts the inline tabs (special offer) at the end with a margin, not justify-content', () => {
    const inline = '.s-block--featured-products .tabs.tabs--inline';
    expect(declsFor(root, inline)['justify-content']).toBeUndefined();
    expect(declsFor(root, `${inline} > .tab-trigger:last-child`)['margin-inline-end']).toBe('0');
  });
});
