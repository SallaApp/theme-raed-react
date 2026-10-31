import { describe, it, expect } from 'vitest';
import { productCardLayout } from '../../app/hooks/useProductCardLayout';

describe('productCardLayout', () => {
  it('reads the dropdown as a string or as [{ value }]', () => {
    expect(productCardLayout('horizontal')).toBe('horizontal');
    expect(productCardLayout([{ value: 'horizontal' }])).toBe('horizontal');
  });

  it('falls back to vertical when unset or unknown', () => {
    expect(productCardLayout(undefined)).toBe('vertical');
    expect(productCardLayout('diagonal')).toBe('vertical');
  });
});
