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
