import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import * as sass from 'sass';
import postcss, { type AtRule, type Rule } from 'postcss';
import tailwindcss from 'tailwindcss';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { AddToCartForm } from '../../app/components/product/AddToCartForm';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: { settings: {} } }),
}));

// jsdom gives `import.meta.url` a non-file scheme; vitest runs from the theme root.
const themeRoot = `${path.resolve(process.cwd())}/`;
const tailwindConfig = createRequire(`${themeRoot}package.json`)(`${themeRoot}tailwind.config.cjs`);

const PHONE = '(max-width: 640px)';

/** Selectors of the rules that hide something at phone width in `product.scss`. */
let phoneHiders: string[] = [];

beforeAll(async () => {
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/product.scss`);
  const { root } = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
  ]).process(css, { from: undefined });
  root.walkRules((rule: Rule) => {
    const media = rule.parent?.type === 'atrule' ? (rule.parent as AtRule) : null;
    if (media?.name !== 'media' || media.params !== PHONE) return;
    let hides = false;
    rule.walkDecls('display', (d) => {
      if (d.value === 'none') hides = true;
    });
    if (hides) phoneHiders.push(...rule.selectors);
  });

  // jsdom has no IntersectionObserver; report every element as visible so the
  // deferred-hydration wrappers mount the real web-component hosts.
  class VisibleObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.cb(
        [{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.IntersectionObserver = VisibleObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  cleanup();
  document.body.className = '';
});

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 266863684,
    name: 'Product',
    price: 500,
    regular_price: 500,
    sale_price: 0,
    is_on_sale: false,
    status: 'sale',
    type: 'product',
    max_quantity: 163,
    ...overrides,
  }) as Product;

/** True when a phone-width `display: none` rule matches `el` or one of its ancestors. */
function hiddenOnPhone(el: Element | null): boolean {
  for (let node = el; node; node = node.parentElement) {
    if (phoneHiders.some((sel) => node!.matches(sel))) return true;
  }
  return false;
}

/** Renders the form on a product page with the sticky bar on, as `ProductPage` does. */
async function renderBar(product: Product) {
  document.body.className = 'product-single is-sticky-product-bar';
  const { container } = render(<AddToCartForm product={product} stickyAddToCart />);
  await waitFor(() => expect(container.querySelector('salla-add-product-button')).toBeTruthy());
  return {
    button: container.querySelector('salla-add-product-button'),
    quantity: container.querySelector('salla-quantity-input'),
    label: container.querySelector('.sticky-product-bar .out-of-stock'),
  };
}

describe('sticky add-to-cart bar on phones', () => {
  it('compiles the phone-width rules it is checked against', () => {
    expect(phoneHiders.length).toBeGreaterThan(0);
  });

  it('shows only the out-of-stock label for a sold-out product', async () => {
    const { button, quantity, label } = await renderBar(
      makeProduct({ is_out_of_stock: true, status: 'out' })
    );
    expect(hiddenOnPhone(button)).toBe(true);
    expect(hiddenOnPhone(quantity)).toBe(true);
    expect(hiddenOnPhone(label)).toBe(false);
  });

  it('keeps the "notify me" button for an out-and-notify product', async () => {
    const { button, label } = await renderBar(
      makeProduct({ is_out_of_stock: true, status: 'out-and-notify' })
    );
    expect(hiddenOnPhone(button)).toBe(false);
    expect(hiddenOnPhone(label)).toBe(false);
  });

  it('keeps the stepper and the button for an in-stock product', async () => {
    const { button, quantity } = await renderBar(makeProduct());
    expect(hiddenOnPhone(button)).toBe(false);
    expect(hiddenOnPhone(quantity)).toBe(false);
  });
});
