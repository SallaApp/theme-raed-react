import { describe, it, expect, vi } from 'vitest';
import { searchListingSearch } from '@salla.sa/twilight-theme-engine/routes/product-listing';

// The setup file stubs only the exports the other tests use; the engine's listing module needs the rest at import.
vi.mock('@salla.sa/twilight-components-react', async (importOriginal) => importOriginal());

// TanStack JSON-parses `?q=3000` to a number; the engine route must hand the loader a string.
describe('search route query', () => {
  it.each([
    [3000, '3000'],
    [123, '123'],
    [0, '0'],
    [true, 'true'],
    ['shoes', 'shoes'],
  ])('keeps ?q=%s as the string %s', (q, expected) => {
    const { q: parsed } = searchListingSearch.validateSearch({ q });

    expect(parsed).toBe(expected);
  });

  it('defaults a missing query to an empty string', () => {
    expect(searchListingSearch.validateSearch({}).q).toBe('');
  });

  it('forwards the string query to the loader', () => {
    const search = searchListingSearch.validateSearch({ q: 3000 });

    expect(searchListingSearch.loaderDeps({ search }).q).toBe('3000');
  });
});
