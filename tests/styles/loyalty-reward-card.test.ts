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

/** Every declaration of `prop` on rules whose selector list includes `selector`, top level only (no media queries). */
function values(root: Root, selector: string, prop: string): string[] {
  const found: string[] = [];
  root.walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) return;
    rule.walkDecls(prop, (d) => {
      found.push(d.value);
    });
  });
  return found;
}

describe('loyalty reward cards', () => {
  it('wraps the reward name and description the Tailwind theme truncates to one line', async () => {
    // `.s-loyalty-program-rewards-name { @apply truncate }` cut long rewards
    // off, and the details modal never shows that text.
    const root = await compile('04-components/loyalty.scss');
    const name = '.s-loyalty-program-rewards-name';

    expect(values(root, name, 'white-space')).toEqual(['normal']);
    expect(values(root, name, 'overflow')).toEqual(['visible']);
    expect(values(root, name, 'text-overflow')).toEqual(['clip']);
    expect(values(root, name, 'overflow-wrap')).toEqual(['break-word']);
  });

  it('stretches the cards in a row to one height so the action buttons line up', async () => {
    const root = await compile('04-components/loyalty.scss');

    for (const container of ['.s-loyalty-program-rewards-container', '.s-loyalty-program-rewards-container-cart']) {
      expect(values(root, `${container} .swiper-slide`, 'height')).toEqual(['auto']);
    }
    expect(values(root, '.s-loyalty-program-reward-host', 'height')).toEqual(['100%']);
    expect(values(root, '.s-loyalty-program-reward-container', 'display')).toEqual(['flex']);
    expect(values(root, '.s-loyalty-program-reward-container', 'flex-direction')).toEqual(['column']);
    expect(values(root, '.s-loyalty-program-reward-container > [role=button]', 'flex')).toEqual(['1 1 0%']);
  });
});
