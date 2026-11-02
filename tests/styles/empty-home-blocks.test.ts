// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';

const stylesDir = fileURLToPath(new URL('../../app/styles/04-components/', import.meta.url));

const collapsed = (css: string) => css.replace(/\s+/g, ' ');

describe('empty home blocks', () => {
  it('drops the footer gap past empty blocks, unless the reorder block has products', () => {
    const { css } = sass.compile(`${stylesDir}footer.scss`);
    const selector = collapsed(css);
    expect(selector).toContain("section[class*=full-bg]:nth-last-of-type(2) ~ section:empty:last-of-type");
    expect(selector).toContain(':not(:has(> #reorder-section > section:not(:empty))) + .store-footer');
  });
});
