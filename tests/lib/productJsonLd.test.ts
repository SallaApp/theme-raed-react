import { describe, it, expect } from 'vitest';
import type { HeadDescriptor } from '@salla.sa/twilight-theme-engine/utils/head';
import { productGtin, productOfferPrice, withProductJsonLd } from '../../app/lib/productJsonLd';

// What products/{id}/details sends for a product that is not on sale: sale_price is 0.
const notOnSale = { is_on_sale: false, sale_price: 0, price: 120, starting_price: null, gtin: '' };
const onSale = { is_on_sale: true, sale_price: 188, price: 188, starting_price: null, gtin: '' };

// The engine's head for a product page, trimmed to what the fix reads.
function engineHead(price: unknown): HeadDescriptor {
  return {
    title: 'Chair | Store',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Chair',
      offers: { '@type': 'Offer', price, priceCurrency: 'SAR', availability: 'https://schema.org/InStock' },
    },
  };
}

function offer(result: HeadDescriptor) {
  return (result.jsonLd as Record<string, Record<string, unknown>>).offers;
}

describe('productOfferPrice', () => {
  it('uses the price, not sale_price 0, when the product is not on sale', () => {
    expect(productOfferPrice(notOnSale)).toBe(120);
  });

  it('uses the sale price while a discount is on', () => {
    expect(productOfferPrice({ is_on_sale: true, sale_price: 3, price: 3, starting_price: null })).toBe(3);
  });

  it('uses the "starting from" price the page shows for a product with variants', () => {
    expect(productOfferPrice({ is_on_sale: false, sale_price: 0, price: 199, starting_price: 189 })).toBe(189);
  });

  it('falls back to the price when a product on sale has no sale price', () => {
    expect(productOfferPrice({ is_on_sale: true, sale_price: null, price: 50, starting_price: null })).toBe(50);
  });

  it('reads a numeric string price and ignores one that is not a number', () => {
    expect(productOfferPrice({ is_on_sale: false, sale_price: 0, price: '30.50', starting_price: null })).toBe(30.5);
    expect(productOfferPrice({ is_on_sale: false, sale_price: 0, price: 'n/a', starting_price: null })).toBeUndefined();
  });
});

describe('productGtin', () => {
  it.each([
    ['12345670', 'gtin8'],
    ['012345678905', 'gtin12'],
    ['6281001234567', 'gtin13'],
    ['16281001234564', 'gtin14'],
  ])('writes %s under %s', (gtin, key) => {
    expect(productGtin(gtin)).toEqual({ [key]: gtin });
  });

  it.each([[''], [null], [undefined], ['123'], ['62810012345AB'], ['123456789']])('writes nothing for %s', (gtin) => {
    expect(productGtin(gtin)).toEqual({});
  });
});

describe('withProductJsonLd', () => {
  it('replaces the offer price 0 with the price the page shows, and keeps the rest of the offer', () => {
    const result = withProductJsonLd(engineHead(0), notOnSale);

    expect(offer(result)).toEqual({
      '@type': 'Offer',
      price: 120,
      priceCurrency: 'SAR',
      availability: 'https://schema.org/InStock',
    });
    expect(result.title).toBe('Chair | Store');
  });

  it('adds a 13-digit GTIN as gtin13', () => {
    const result = withProductJsonLd(engineHead(0), { ...notOnSale, gtin: '6281001234567' });

    expect((result.jsonLd as Record<string, unknown>).gtin13).toBe('6281001234567');
  });

  it('leaves the head alone when there is no product JSON-LD', () => {
    const head: HeadDescriptor = { title: 'Products' };

    expect(withProductJsonLd(head, notOnSale)).toBe(head);
    expect(withProductJsonLd(engineHead(0), undefined)).toEqual(engineHead(0));
  });
});
