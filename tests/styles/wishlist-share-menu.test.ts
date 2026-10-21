// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type Root, type Rule } from 'postcss';
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

function decl(rule: Rule, prop: string): string | undefined {
  let value: string | undefined;
  rule.walkDecls(prop, (d) => {
    value = d.value;
  });
  return value;
}

describe('wishlist Share menu', () => {
  it("hangs from the button's end edge, outranking the engine's `rtl:right-0 ltr:left-0`", async () => {
    // The bar is `justify-end`; anchored at the start edge, the menu opened
    // past the screen edge on phones.
    const rules: Rule[] = [];
    (await compile('04-components/user-pages.scss')).walkRules((rule) => {
      if (rule.selector.includes('.s-wishlist-actions-menu') && decl(rule, 'inset-inline-end')) rules.push(rule);
    });

    expect(rules).toHaveLength(1);
    const [rule] = rules;
    expect(decl(rule, 'inset-inline-end')).toBe('0');
    expect(decl(rule, 'inset-inline-start')).toBe('auto');
    expect(decl(rule, 'max-width')).toBe('calc(100vw - 2rem)');
    // The engine's utilities are one class (`:where()` adds nothing).
    expect(rule.selector.match(/\.[\w-]+/g)?.length).toBeGreaterThan(1);
  });
});
