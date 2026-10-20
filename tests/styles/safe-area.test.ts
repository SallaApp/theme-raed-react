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
  it("pads the body by the app's insets, outranking the engine's later `html,body{padding:0}`", async () => {
    // The engine's inline head style (`routes/root/head.ts`) loads after the
    // theme's stylesheet; a `body` rule of equal weight lost to it.
    const engine = specificity('body');

    const rules: Rule[] = [];
    (await compile('02-generic/common.scss')).walkRules((rule) => {
      if (decl(rule, 'padding-top')?.includes('--app-safe-area-top')) rules.push(rule);
    });

    expect(rules).toHaveLength(1);
    const [rule] = rules;
    expect(decl(rule, 'padding-bottom')).toBe('var(--app-safe-area-bottom, 0px)');
    expect(rule.selectors.every((sel) => beats(specificity(sel), engine))).toBe(true);
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
