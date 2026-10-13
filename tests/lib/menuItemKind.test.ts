import { describe, it, expect } from 'vitest';
import { builtInMenuKind } from '../../app/lib/menuItemKind';

describe('builtInMenuKind', () => {
  it('reads the word id of a built-in item', () => {
    expect(builtInMenuKind({ id: 'offers', url: '/x' })).toBe('offers');
    expect(builtInMenuKind({ id: 'blog', url: '/x' })).toBe('blog');
    expect(builtInMenuKind({ id: 'brands', url: '/x' })).toBe('brands');
  });

  it('falls back to the id in attrs', () => {
    expect(builtInMenuKind({ id: 7, url: '/x', attrs: ' id="blog"' })).toBe('blog');
  });

  it('falls back to the last path segment of the url, with or without origin and locale', () => {
    expect(builtInMenuKind({ id: 1, url: 'https://store.test/ar/offers' })).toBe('offers');
    expect(builtInMenuKind({ id: 2, url: '/en/blog/?page=2' })).toBe('blog');
    expect(builtInMenuKind({ id: 3, url: '/brands' })).toBe('brands');
  });

  it('returns null for categories, products and custom links', () => {
    expect(builtInMenuKind({ id: 4, url: '/ar/accessories/c123' })).toBeNull();
    expect(builtInMenuKind({ id: 5, url: '/ar/blog/my-post/p1' })).toBeNull();
    expect(builtInMenuKind({ id: 6, url: '#' })).toBeNull();
  });
});
