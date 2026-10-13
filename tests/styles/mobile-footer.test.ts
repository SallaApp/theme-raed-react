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

function rulesMatching(root: Root, pattern: RegExp): Rule[] {
  const rules: Rule[] = [];
  root.walkRules((rule) => {
    if (rule.selectors.some((sel) => pattern.test(sel))) rules.push(rule);
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
  it('is white only inside the sheet, footer_is_dark or not', async () => {
    const root = await compile('mobile-account-sheet.scss');

    expect(rulesFor(root, '.store-footer__bottom')).toHaveLength(0);

    const backgrounds = rulesFor(root, '.store-footer--sheet .store-footer__bottom').map((rule) =>
      decl(rule, 'background-color')
    );
    expect(backgrounds.some((bg) => bg?.includes('rgb(255 255 255'))).toBe(true);
  });
});

describe('account sheet footer under footer_is_dark', () => {
  it("drops the dark band behind the cards and keeps the cards' text dark", async () => {
    const root = await compile('mobile-account-sheet.scss');

    const [inner] = rulesFor(
      root,
      'body.footer-is-dark .store-footer--sheet .store-footer__inner'
    );
    expect(decl(inner, 'background-color')).toBe('transparent');

    // Sass may drop the attribute value's quotes, so match the selector loosely.
    const [white] = rulesMatching(
      root,
      /footer-is-dark \.store-footer--sheet \.store-footer__brand \[class~=['"]?text-white/
    );
    expect(white).toBeDefined();
    expect(decl(white, 'color')).not.toMatch(/255 255 255|#fff/i);
  });

  it('puts the menu links and the copyright back to the light footer colours', async () => {
    const root = await compile('mobile-account-sheet.scss');
    const sheet = 'body.footer-is-dark .store-footer--sheet';
    const gray600 = 'rgb(75 85 99';

    const [stacked] = rulesFor(root, `${sheet} .store-footer__menu--stacked .s-menu-footer-item`);
    expect(decl(stacked, 'color')).toContain(gray600);

    const [inline] = rulesFor(root, `${sheet} .store-footer__menu--inline .s-menu-footer-item`);
    expect(decl(inline, 'color')).toContain(gray600);
    expect(decl(inline, 'border-color')).toContain('rgb(209 213 219'); // gray-300

    const [copyright] = rulesFor(root, `${sheet} .copyright-text`);
    expect(decl(copyright, 'color')).toContain('rgb(55 65 81'); // gray-700
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

describe('footer contacts in the account sheet', () => {
  it('hides the footer contacts row only inside the sheet', async () => {
    const root = await compile('mobile-account-sheet.scss');

    expect(rulesFor(root, '.store-footer__contacts')).toHaveLength(0);

    const [rule] = rulesFor(root, '.store-footer--sheet .store-footer__contacts');
    expect(decl(rule, 'display')).toBe('none');
  });
});
