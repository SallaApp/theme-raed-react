import { describe, it, expect } from 'vitest';
import {
  DELIVERY_PROMISE_TYPES,
  deliveryPromisesOf,
} from '../../app/lib/deliveryPromises';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

describe('deliveryPromisesOf', () => {
  it('returns nothing for a missing, null or non-list field', () => {
    expect(deliveryPromisesOf({})).toEqual([]);
    expect(deliveryPromisesOf(null)).toEqual([]);
    expect(deliveryPromisesOf({ delivery_promise: null })).toEqual([]);
    expect(deliveryPromisesOf({ delivery_promise: {} })).toEqual([]);
    expect(deliveryPromisesOf({ delivery_promise: [] })).toEqual([]);
  });

  it('keeps the API order and drops unknown types and empty labels', () => {
    expect(
      deliveryPromisesOf({
        delivery_promise: [
          { type: 'express', label: 'ساعتين' },
          { type: 'teleport', label: 'now' },
          { type: 'next_day', label: ' ' },
          null,
          { type: 'standard', label: '3 أيام' },
        ],
      })
    ).toEqual([
      { type: 'express', label: 'ساعتين' },
      { type: 'standard', label: '3 أيام' },
    ]);
  });
});

describe('delivery promise locale keys', () => {
  it.each(DELIVERY_PROMISE_TYPES)('has an ar and en text with {{label}} for %s', (type) => {
    const key = `blocks.product.delivery_promise.${type}`;
    for (const locale of [ar, en] as Record<string, string>[]) {
      expect(locale[key]).toContain('{{label}}');
    }
  });
});
