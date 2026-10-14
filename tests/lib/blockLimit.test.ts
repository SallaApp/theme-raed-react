import { describe, it, expect } from 'vitest';
import { blockLimit } from '../../app/lib/blockLimit';

describe('blockLimit', () => {
  it('reads a number, or the same as a string', () => {
    expect(blockLimit(8)).toBe(8);
    expect(blockLimit(' 16 ')).toBe(16);
  });

  it('has none when it is missing or not a positive whole number', () => {
    for (const value of [undefined, null, '', 'x', 0, -4, 2.5, '0']) {
      expect(blockLimit(value)).toBeUndefined();
    }
  });
});
