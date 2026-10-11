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
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/${file}`);
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

describe('page footer on mobile', () => {
  it('hides only its widgets, so the footer:start / footer:end hook output stays visible', async () => {
    const root = await compile('footer.scss');

    for (const part of ['__inner', '__bottom']) {
      const [rule] = rulesFor(
        root,
        `.store-footer:not(.store-footer--sheet) > .store-footer${part}`
      );
      expect(rule?.parent?.type).toBe('atrule');
      expect(decl(rule, 'display')).toBe('none');
    }

    for (const rule of rulesFor(root, '.store-footer:not(.store-footer--sheet)')) {
      expect(decl(rule, 'display')).not.toBe('none');
    }
  });
});

describe('account sheet copyright strip', () => {
  it('is white only inside the sheet, and not under footer_is_dark', async () => {
    const root = await compile('mobile-account-sheet.scss');

    expect(rulesFor(root, '.store-footer__bottom')).toHaveLength(0);

    const [rule] = rulesFor(
      root,
      'body:not(.footer-is-dark) .store-footer--sheet .store-footer__bottom'
    );
    expect(decl(rule, 'background-color')).toContain('rgb(255 255 255');
  });
});

describe('footer description in the account sheet', () => {
  it('drops its top margin only inside the sheet', async () => {
    const root = await compile('mobile-account-sheet.scss');

    expect(rulesFor(root, '.store-footer__desc')).toHaveLength(0);

    const [rule] = rulesFor(root, '.store-footer--sheet .store-footer__desc');
    expect(decl(rule, 'margin-top')).toBe('0px');
  });
});
