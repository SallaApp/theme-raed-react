import { describe, it, expect } from 'vitest';
import { showsDisplayAll } from '../../app/lib/displayAll';

describe('showsDisplayAll', () => {
  it('drops the link for a latest block short of its limit', () => {
    expect(showsDisplayAll('latest', 3, 4, null)).toBe(false);
  });

  it('keeps it for a latest block that filled its limit', () => {
    expect(showsDisplayAll('latest', 4, 4, null)).toBe(true);
  });

  it('follows the next page for a latest block without a limit', () => {
    expect(showsDisplayAll('latest', 12, undefined, null)).toBe(false);
    expect(showsDisplayAll('latest', 12, undefined, 'page=2')).toBe(true);
  });

  it('keeps it for every other source', () => {
    expect(showsDisplayAll('categories', 1, 4, null)).toBe(true);
  });
});
