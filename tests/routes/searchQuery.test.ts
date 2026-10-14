import { describe, it, expect, vi } from 'vitest';
import { searchListingSearch } from '@salla.sa/twilight-theme-engine/routes/product-listing';

// The setup file stubs only the exports the other tests use; the engine's listing module needs the rest at import.
vi.mock('@salla.sa/twilight-components-react', async (importOriginal) => importOriginal());

// TD-17264: TanStack Router JSON-parses search params, so `/search?q=3000` reaches the route as the
// number 3000. The engine's search loader calls `.trim()` on it, which threw and showed a 500 page for
// any numeric query. Engine 1.0.95 turns `q` into a string in the route's `validateSearch`; this theme
// uses the engine's generated search route, so it only stays fixed while it resolves 1.0.95 or later.
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
