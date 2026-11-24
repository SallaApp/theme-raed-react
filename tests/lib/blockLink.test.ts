import { describe, it, expect } from 'vitest';
import { blockLinkUrl } from '../../app/lib/blockLink';

describe('blockLinkUrl', () => {
  it("uses the item's own url", () => {
    expect(blockLinkUrl({ url: '/c123', url__type: 'categories' })).toBe('/c123');
    expect(blockLinkUrl({ url: 'https://example.com', url__type: 'custom' })).toBe(
      'https://example.com'
    );
  });

  // TD-18336: the API sends a fixed-page link with its kind and no url.
  it.each([
    ['offers_link', '/offers'],
    ['brands_link', '/brands'],
    ['blog_link', '/blog'],
  ])('links %s with no url to %s', (type, path) => {
    expect(blockLinkUrl({ url__type: type })).toBe(path);
    expect(blockLinkUrl({ url: '', url__type: type })).toBe(path);
    expect(blockLinkUrl({ url: '  ', url__type: type })).toBe(path);
  });

  it('has nowhere to go for an item with neither', () => {
    expect(blockLinkUrl({})).toBeUndefined();
    expect(blockLinkUrl({ url__type: 'products' })).toBeUndefined();
    expect(blockLinkUrl({ url: 42, url__type: 7 })).toBeUndefined();
    expect(blockLinkUrl(null)).toBeUndefined();
    expect(blockLinkUrl(undefined)).toBeUndefined();
  });
});
