// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type AtRule, type Root, type Rule } from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

async function compile(): Promise<Root> {
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/mobile-page-title.scss`);
  const result = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
  ]).process(css, { from: undefined });
  return result.root;
}

function rulesFor(root: Root, selector: string): Rule[] {
  const rules: Rule[] = [];
  root.walkRules((rule) => {
    if (rule.selectors.includes(selector)) rules.push(rule);
  });
  return rules;
}

function decl(rule: Rule, prop: string): string | undefined {
  let value: string | undefined;
  rule.walkDecls(prop, (d) => {
    value = d.value;
  });
  return value;
}

describe('account pages on phones', () => {
  // CustomerLayout's own `.main-content > h1` repeats the title bar's text.
  // `.profile-header` is rendered by that layout only; the engine sets no
  // `customer-*` body class on the /account/* routes to key off instead.
  const selector = 'body:has(.profile-header) .main-content > h1';

  it("hides the page's own heading below md, where the title bar names the page", async () => {
    const [rule] = rulesFor(await compile(), selector);
    expect(rule).toBeDefined();
    expect(decl(rule, 'display')).toBe('none');
    expect((rule.parent as AtRule).params).toBe('(max-width: 767px)');
  });

  it('keeps the heading from md up, where there is no title bar', async () => {
    const rules = rulesFor(await compile(), selector);
    expect(rules.every((rule) => rule.parent?.type === 'atrule')).toBe(true);
  });
});

describe('breadcrumbs on phones', () => {
  async function compileFile(file: string): Promise<Root> {
    const { css } = sass.compile(`${themeRoot}app/styles/04-components/${file}`);
    const result = await postcss([
      tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
    ]).process(css, { from: undefined });
    return result.root;
  }

  it('hides the breadcrumb bar below md, where the title bar names the page', async () => {
    const rules = rulesFor(await compileFile('breadcrumb.scss'), '.breadcrumbs').filter(
      (rule) => decl(rule, 'display') === 'none'
    );
    expect(rules).toHaveLength(1);
    expect((rules[0].parent as AtRule).params).toBe('(max-width: 767px)');
  });

  it("keeps the title bar's bottom gap, with no breadcrumb under it to sit flush against", async () => {
    const root = await compile();
    expect(rulesFor(root, '.app-inner:has(.breadcrumbs) .mobile-page-title')).toHaveLength(0);
    expect(rulesFor(root, '.app-inner:has(.s-catalog-toolbar-sticky) .mobile-page-title')).toHaveLength(1);
  });
});

describe('filter bar on phones', () => {
  it('is slimmer than the desktop bar', async () => {
    const { css } = sass.compile(`${themeRoot}app/styles/04-components/product-list.scss`);
    const root = (
      await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(css, {
        from: undefined,
      })
    ).root;

    const [desktop] = rulesFor(root, '.s-catalog-toolbar');
    expect(decl(desktop, 'min-height')).toBe('3.25rem');

    const [phone] = rulesFor(root, '.s-catalog-toolbar-sticky .s-catalog-toolbar');
    expect((phone.parent as AtRule).params).toBe('(max-width: 767px)');
    expect(decl(phone, 'min-height')).toBe('2.75rem');
  });
});

describe('header search on phones', () => {
  it("is hidden below md, where the bottom bar has its own search tab", async () => {
    const { css } = sass.compile(`${themeRoot}app/styles/04-components/header.scss`);
    const root = (
      await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(css, {
        from: undefined,
      })
    ).root;

    const rules = rulesFor(root, '.header-action.site-header__search');
    expect(rules).toHaveLength(1);
    expect(decl(rules[0], 'display')).toBe('none');
    expect((rules[0].parent as AtRule).params).toBe('(max-width: 767px)');
  });
});
