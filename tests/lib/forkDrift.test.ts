import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The engine does not update the components this theme forked (FORKS.md). This test records the
// engine source each fork was last synced with and fails when the installed engine's copy of that
// source changes, so an engine upgrade cannot silently leave a fork behind.

const root = join(__dirname, '../..');
const engineSource = join(root, 'node_modules/@salla.sa/twilight-theme-engine/tailwind');

const sha = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16);

// Fork (app/components/…) -> engine source (tailwind/…) and the sha256 prefix of that source at
// the version the fork was synced with. After porting upstream changes into a fork, set `synced`
// to the new hash and update the fork's Base in FORKS.md.
const FORKS: Record<string, { source: string; synced: string }> = {
  'product/ProductPage.tsx': {
    source: 'routes/product/ProductPage.tsx',
    synced: '9775e0159c3d35d7',
  },
  'product/ProductDetails.tsx': {
    source: 'components/product/ProductDetails.tsx',
    synced: '883af72725d44f8d',
  },
  'product/ProductGallery.tsx': {
    source: 'components/product/ProductGallery.tsx',
    synced: 'd121b8fb716b1800',
  },
  'product/AddToCartForm.tsx': {
    source: 'components/product/AddToCartForm.tsx',
    synced: '4eab7e12a8e18f38',
  },
  'product/ProductListPage.tsx': {
    source: 'routes/product-listing/ProductListPage.tsx',
    synced: 'b4a7ed1563a963c7',
  },
  'cart/CartPage.tsx': { source: 'routes/cart/CartPage.tsx', synced: '5cf0eaa4f7c95213' },
  'cart/CartItem.tsx': { source: 'components/cart/CartItem.tsx', synced: '47f86dd848074439' },
  'page/PageSingle.tsx': { source: 'routes/page/PageSingle.tsx', synced: 'cb917020dbaebb01' },
  'home/FixedProducts.tsx': {
    source: 'components/home/FixedProducts.tsx',
    synced: '01cb3a8afe501424',
  },
};

// Forks already behind the installed engine, each with the task that ports the upstream change.
// Remove an entry once the port lands; the last test fails until you do.
const KNOWN_DRIFT: Record<string, string> = {
  'home/FixedProducts.tsx':
    'F4: upstream reads the vertical_fixed_products setting and validates the limit',
  'product/ProductGallery.tsx':
    'F6: upstream adds the legacy mobile::gallery.open payload for older SDKs',
  'product/AddToCartForm.tsx': 'upstream dropped loaderPosition from the add-product button',
};

const forksTable = readFileSync(join(root, 'FORKS.md'), 'utf8');
const listedForks = [...forksTable.matchAll(/^\| `([^`]+\.tsx)`/gm)].map((match) => match[1]);
const drifted = Object.entries(FORKS)
  .filter(
    ([, { source, synced }]) =>
      sha(readFileSync(join(engineSource, `${source}.txt`), 'utf8')) !== synced
  )
  .map(([fork]) => fork);

describe('forked engine components are in sync with the installed engine', () => {
  it('tracks exactly the forks FORKS.md lists', () => {
    expect([...listedForks].sort()).toEqual(Object.keys(FORKS).sort());
  });

  it('has no fork behind the engine beyond the known, ticketed ones', () => {
    const unexpected = drifted.filter((fork) => !(fork in KNOWN_DRIFT));
    expect(unexpected.map((fork) => `${fork} <- engine tailwind/${FORKS[fork].source}`)).toEqual(
      []
    );
  });

  it('lists no known drift that has since been synced', () => {
    expect(Object.keys(KNOWN_DRIFT).filter((fork) => !drifted.includes(fork))).toEqual([]);
  });
});
