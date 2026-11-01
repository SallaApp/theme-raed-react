import { describe, it, expect } from 'vitest';
import { PRODUCT_IMAGE_PLACEHOLDER, withImageFallback } from '../../app/lib/productImage';

const pick = (product: object) => withImageFallback(product as never) as never as {
  product: { image: { url: string; alt?: string } };
  isPlaceholder: boolean;
};

describe('withImageFallback', () => {
  it('keeps a product that has a photo, untouched', () => {
    const product = { image: { url: 'a.jpg' }, thumbnail: 'b.jpg' };
    const result = pick(product);
    expect(result.product).toBe(product);
    expect(result.isPlaceholder).toBe(false);
  });

  it('falls back to the thumbnail, which is a real photo', () => {
    const result = pick({ image: { url: '' }, thumbnail: 'b.jpg' });
    expect(result.product.image.url).toBe('b.jpg');
    expect(result.isPlaceholder).toBe(false);
  });

  it.each([
    ['no image', {}],
    ['a null image', { image: null }],
    ['an empty url', { image: { url: '' } }],
    ['a null url and thumbnail', { image: { url: null }, thumbnail: null }],
  ])('uses the placeholder for %s', (_name, product) => {
    const result = pick(product);
    expect(result.product.image.url).toBe(PRODUCT_IMAGE_PLACEHOLDER);
    expect(result.isPlaceholder).toBe(true);
  });

  it('keeps the rest of the image, such as its alt text', () => {
    expect(pick({ image: { url: '', alt: 'Shoe' } }).product.image.alt).toBe('Shoe');
  });
});
