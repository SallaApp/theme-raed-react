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
    const item = '.s-menu-root-level';
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
  const sub = String.raw`\.s-menu-sub-menu`;
  const rootItem = String.raw`\.s-menu-root-level`;
  const mega = String.raw`\.s-menu-mega-menu`;

  // A panel that scrolls clips the panel flying out of one of its rows.
  it('never clips a nested panel', async () => {
    const css = await compileHeader();
    const panels = rulesMatching(css, new RegExp(`__mainmenu ${sub}$`));
    expect(panels.length).toBeGreaterThan(0);
    expect(panels.some((rule) => decl(rule, 'overflow') === 'visible')).toBe(true);
    expect(panels.some((rule) => decl(rule, 'max-height') === 'none')).toBe(true);
    for (const rule of panels) {
      expect(decl(rule, 'overflow-y')).toBeUndefined();
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
      '.site-header--default .site-header__mainmenu .site-header__oneline-menu',
    ]) {
      expect(declFor(css, selector, 'align-items'), selector).toBe('stretch');
    }
  });

  // In Arabic a nested panel opens to the left of its row, past the row's end
  // edge; inside "More" too, where there is room for it.
  it('opens nested panels past their row, inside "More" as well', async () => {
    const css = await compileHeader();
    const [nested] = rulesMatching(css, new RegExp(`__mainmenu ${sub} ${sub}$`));
    expect(decl(nested, 'inset-inline')).toBe('100% auto');
    expect(rulesMatching(css, new RegExp(`\\[data-more-menu\\] ${sub} ${sub}`))).toHaveLength(0);
  });

  it('squares the top corners of first-level panels only', async () => {
    const css = await compileHeader();
    const [first] = rulesMatching(css, new RegExp(`__mainmenu ${rootItem} > ${sub}$`));
    expect(decl(first, 'border-top-left-radius')).toBe('0px');
    expect(decl(first, 'border-top-right-radius')).toBe('0px');
    // Moved back inside the window by HeaderMainMenu.tsx when it would cross the edge.
    expect(decl(first, 'translate')).toBe('var(--panel-shift, 0) 0');

    // Nested panels keep the base panel's full radius.
    const [nested] = rulesMatching(css, new RegExp(`__mainmenu ${sub} ${sub}$`));
    expect(decl(nested, 'border-top-left-radius')).toBeUndefined();
    const panels = rulesMatching(css, new RegExp(`__mainmenu ${sub}$`));
    expect(panels.some((rule) => decl(rule, 'border-radius') === '16px')).toBe(true);
  });

  it('lays a mega panel out as four product columns', async () => {
    const css = await compileHeader();
    const selector = [
      '.site-header--default .site-header__mainmenu',
      '.s-menu-products-wrapper .s-products-list-vertical-cards',
    ].join(' ');
    expect(declFor(css, selector, 'grid-template-columns')).toBe('repeat(4, minmax(0, 1fr))');
  });

  // A fixed header leaves no way to scroll to a panel taller than the screen,
  // and a scrolling panel would clip its nested panels: a long list gets columns.
  it('lays a long list out in columns, in any panel, without scrolling', async () => {
    const css = await compileHeader();
    const [list] = rulesMatching(css, new RegExp(`__mainmenu ${sub} > ul\\.s-menu-columns$`));
    expect(decl(list, 'display')).toBe('grid');
    expect(decl(list, 'grid-template-columns')).toContain('var(--menu-columns)');
  });

  it('can open a nested panel toward the row start, when it would not fit', async () => {
    const css = await compileHeader();
    const [flipped] = rulesMatching(css, new RegExp(`\\.s-menu-opens-start > ${sub}$`));
    expect(decl(flipped, 'inset-inline')).toBe('auto 100%');
  });

  // With room on neither side, a nested panel is capped to the roomier one;
  // the cap has to beat a nested mega panel's 48rem min-width.
  it('caps a nested panel that fits on neither side', async () => {
    const css = await compileHeader();
    const [capped] = rulesMatching(
      css,
      new RegExp(`\\.s-menu-has-children > ${sub}\\[data-capped\\]$`)
    );
    expect(decl(capped, 'max-width')).toBe('var(--panel-max)');
    expect(decl(capped, 'min-width')).toBe('0');
  });

  it('stacks a mega panel\'s products below links laid out in columns', async () => {
    const css = await compileHeader();
    const [stacked] = rulesMatching(css, new RegExp(`${mega} > ${sub}\\.is-stacked$`));
    expect(decl(stacked, 'flex-direction')).toBe('column');
  });

  // Only the products scroll: they hold no nested menus to clip.
  it("scrolls a mega panel's products, not the panel", async () => {
    const css = await compileHeader();
    const [products] = rulesMatching(css, /__mainmenu \.s-menu-products-wrapper$/);
    expect(decl(products, 'overflow-y')).toBe('auto');
  });
});
