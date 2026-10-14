// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type Root, type Rule } from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

async function compileHeader(): Promise<Root> {
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/header.scss`);
  const result = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
  ]).process(css, { from: undefined });
  return result.root;
}

function ruleFor(root: Root, selector: string): Rule | undefined {
  let found: Rule | undefined;
  root.walkRules((rule) => {
    if (rule.selectors.includes(selector)) found = rule;
  });
  return found;
}

/** `prop` as set by any rule for exactly `selector` (a selector can have several). */
function declFor(root: Root, selector: string, prop: string): string | undefined {
  let value: string | undefined;
  root.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(prop, (d) => {
      value = d.value;
    });
  });
  return value;
}

/** Every rule with a selector matching `pattern`. */
function rulesMatching(root: Root, pattern: RegExp): Rule[] {
  const rules: Rule[] = [];
  root.walkRules((rule) => {
    if (rule.selectors.some((selector) => pattern.test(selector))) rules.push(rule);
  });
  return rules;
}

function decl(rule: Rule | undefined, prop: string): string | undefined {
  let value: string | undefined;
  rule?.walkDecls(prop, (d) => {
    value = d.value;
  });
  return value;
}

describe('one-line main menu (enable_more_menu)', () => {
  const scope = '.site-header--default .site-header__mainmenu .site-header__oneline-menu';

  // A no-wrap flex row squeezes its items rather than overflowing: they would
  // measure as fitting, wrap their text, and nothing would ever move into "More".
  it('keeps each root item at its natural width, on one line', async () => {
    const root = await compileHeader();
    // Matches Twilight 3.x's `.s-menu-root-level` and 2.14's `.root-level`.
    const item = ':is(.s-menu-root-level, .root-level)';
    for (const selector of [`${scope} ${item}`, `${scope} ${item} > a`]) {
      const rule = ruleFor(root, selector);
      expect(decl(rule, 'flex-shrink'), selector).toBe('0');
      expect(decl(rule, 'white-space'), selector).toBe('nowrap');
    }
  });

  it('lays the row out on one line', async () => {
    const root = await compileHeader();
    expect(decl(ruleFor(root, `${scope} .main-menu`), 'flex-wrap')).toBe('nowrap');
  });
});

describe('default layout dropdown panels', () => {
  const sub = String.raw`:is\(\.s-menu-sub-menu, \.sub-menu\)`;
  const rootItem = String.raw`:is\(\.s-menu-root-level, \.root-level\)`;
  const mega = String.raw`:is\(\.s-menu-mega-menu, \.mega-menu\)`;

  // A panel that scrolls clips the panel flying out of one of its rows.
  it('never clips a nested panel', async () => {
    const css = await compileHeader();
    const panels = rulesMatching(css, new RegExp(`__mainmenu ${sub}$`));
    expect(panels.length).toBeGreaterThan(0);
    for (const rule of panels) {
      expect(decl(rule, 'overflow-y')).toBeUndefined();
      expect(decl(rule, 'overflow')).toBeUndefined();
    }
  });

  it('spans a top-level mega panel across the header row', async () => {
    const css = await compileHeader();
    const [item] = rulesMatching(css, new RegExp(`__mainmenu ${rootItem}${mega}$`));
    expect(decl(item, 'position')).toBe('static');

    const [panel] = rulesMatching(css, new RegExp(`__mainmenu ${rootItem}${mega} > ${sub}$`));
    expect(decl(panel, 'inset-inline')).toBe('0');
    expect(decl(panel, 'width')).toBe('auto');
  });

  // A gap between an item and its panel is space the pointer crosses with
  // neither under it: the panel closes before the pointer reaches it.
  it('opens a panel flush with its item, which spans the header row', async () => {
    const css = await compileHeader();
    const [panel] = rulesMatching(css, new RegExp(`__mainmenu ${sub}$`));
    expect(decl(panel, 'top')).toBe('100%');

    expect(declFor(css, '.site-header--default .site-header__mainmenu', 'align-self')).toBe(
      'stretch'
    );
    for (const selector of [
      '.site-header--default .site-header__mainmenu .main-menu',
      '.site-header--default .site-header__mainmenu salla-menu',
      '.site-header--default .site-header__mainmenu .site-header__oneline-menu',
    ]) {
      expect(declFor(css, selector, 'align-items'), selector).toBe('stretch');
    }
  });
});
