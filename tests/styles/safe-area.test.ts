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

/** `[ids, classes / attributes / pseudo-classes, types]` of a simple selector without `:is()` / `:where()`. */
function specificity(selector: string): [number, number, number] {
  const ids = selector.match(/#[\w-]+/g)?.length ?? 0;
  const classes = selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g)?.length ?? 0;
  const types = selector.replace(/[#.:[][^\s>+~]*/g, ' ').match(/[a-z][\w-]*/gi)?.length ?? 0;
  return [ids, classes, types];
}

const beats = (a: number[], b: number[]) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

describe("the Salla app's insets on the page", () => {
  it("pads the body by the app's bottom inset only, outranking the engine's later `html,body{padding:0}`", async () => {
    // The engine's inline head style (`routes/root/head.ts`) loads after the
    // theme's stylesheet; a `body` rule of equal weight lost to it.
    const engine = specificity('body');

    const rules: Rule[] = [];
    (await compile('02-generic/common.scss')).walkRules((rule) => {
      if (decl(rule, 'padding-bottom')?.includes('--app-safe-area-bottom')) rules.push(rule);
    });

    expect(rules).toHaveLength(1);
    const [rule] = rules;
    // The page runs under the status bar: the header takes the top inset.
    expect(decl(rule, 'padding-top')).toBeUndefined();
    expect(rule.selectors.every((sel) => beats(specificity(sel), engine))).toBe(true);
  });

  it('grows the header by the status bar with a strip that stays stuck to the top', async () => {
    const strips: Rule[] = [];
    (await compile('04-components/header.scss')).walkRules((rule) => {
      if (rule.selectors.includes('.site-header__safe-area')) strips.push(rule);
    });

    expect(strips).toHaveLength(1);
    const [strip] = strips;
    expect(decl(strip, 'height')).toBe('var(--app-safe-area-top, 0px)');
    expect(decl(strip, 'position')).toBe('sticky');
    expect(decl(strip, 'top')).toBe('0px');
    // Above the pinned bar (z-40), so nothing scrolls over the status bar.
    expect(Number(decl(strip, 'z-index'))).toBeGreaterThan(40);
  });

  it('starts the full-screen sheets below the status bar', async () => {
    const root = await compile('04-components/mobile-account-sheet.scss');
    for (const sheet of ['.bottom-sheet.account-sheet', '.bottom-sheet.important-links-sheet']) {
      const padded: string[] = [];
      root.walkRules((rule) => {
        if (rule.selectors.includes(sheet)) padded.push(decl(rule, 'padding-top') ?? '');
      });
      expect(padded).toContain('var(--safe-top)');
    }
  });
});
