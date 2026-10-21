// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type Root } from 'postcss';
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

describe('thank-you page hero', () => {
  it("isolates the page content so the engine's `-z-1` hero band paints above `.app-inner`'s background", async () => {
    // Without a stacking context between it and the root, the band painted
    // under `.app-inner { bg-white }` and never showed.
    const isolated: string[] = [];
    (await compile('04-components/user-pages.scss')).walkDecls('isolation', (d) => {
      if (d.value === 'isolate' && d.parent?.type === 'rule') isolated.push((d.parent as { selector: string }).selector);
    });
    expect(isolated).toEqual(['body.thank-you #main-content']);
  });
});
