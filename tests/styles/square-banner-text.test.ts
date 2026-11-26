// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import * as sass from 'sass';
import postcss, { type Root, type Rule } from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

let root: Root;

beforeAll(async () => {
  const { css } = sass.compile(`${themeRoot}app/styles/app.scss`);
  const result = await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(
    css,
    { from: undefined }
  );
  root = result.root;
});

/** Every rule that sets `prop: value` on a selector mentioning the square banner's title. */
function rulesSetting(prop: string, value: string) {
  const found: { selector: string; media: string[] }[] = [];
  root.walkDecls(prop, (decl) => {
    const rule = decl.parent as Rule;
    if (decl.value !== value || rule.type !== 'rule' || !/\.banner-entry\b[^,]* h3/.test(rule.selector)) {
      return;
    }
    const media: string[] = [];
    for (let node = rule.parent; node && node.type !== 'root'; node = node.parent) {
      if (node.type === 'atrule' && node.name === 'media') media.push(node.params);
    }
    found.push({ selector: rule.selector, media });
  });
  return found;
}

// The square banners' title and description sit on a darkened photo. From lg up
// they appear on mouse hover; with no mouse they must not stay hidden.
describe('square banner text', () => {
  it('hides the text only where the device can hover, from lg up', () => {
    const hiding = rulesSetting('opacity', '0');
    expect(hiding.length).toBeGreaterThan(0);
    for (const rule of hiding) {
      expect(rule.media.join(' ')).toMatch(/\(hover: hover\)/);
      expect(rule.media.join(' ')).toMatch(/min-width: 1024px/);
    }
  });

  it('shows the text for a keyboard user on the banner', () => {
    for (const rule of rulesSetting('opacity', '0')) {
      expect(rule.selector).toContain(':not(:focus-visible)');
    }
  });

  it("shows the square photos' hover overlay on keyboard focus too", () => {
    let focusOverlay = false;
    root.walkRules((rule) => {
      if (rule.selectors.includes('.has-overlay.with-hover:focus-visible:after')) {
        rule.walkDecls('opacity', (decl) => {
          focusOverlay ||= decl.value === '1';
        });
      }
    });
    expect(focusOverlay).toBe(true);
  });
});
