import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BlockHookSlot } from '../../../app/components/common/BlockHookSlot';

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookSlot: ({ name }: { name: string }) => <div data-hook-slot={name} />,
}));

vi.mock('@salla.sa/twilight-theme-engine/home', () => ({
  PageBlocks: ({ hook, scope }: { hook: string; scope: unknown }) => (
    <div data-page-blocks={hook} data-scope={JSON.stringify(scope)} />
  ),
}));

describe('BlockHookSlot', () => {
  it("renders the merchant's blocks for its hook and scope, then the app hook", () => {
    const { container } = render(
      <BlockHookSlot
        name="product.single.before_customer_reviews"
        wrapper="s-before-reviews"
        scope={{ product_id: 7 }}
      />
    );

    const wrapper = container.querySelector('.s-blocks-wrapper.s-before-reviews');
    const [blocks, hook] = Array.from(wrapper?.children ?? []);
    expect(blocks.getAttribute('data-page-blocks')).toBe('product.single.before_customer_reviews');
    expect(blocks.getAttribute('data-scope')).toBe('{"product_id":7}');
    expect(hook.getAttribute('data-hook-slot')).toBe('product.single.before_customer_reviews');
  });

  it('renders only the app hook without a scope, as on offers or search', () => {
    const { container } = render(
      <BlockHookSlot name="product.index.after_testimonials" wrapper="s-after-testimonials" />
    );

    expect(container.querySelector('[data-page-blocks]')).toBeNull();
    expect(container.querySelector('[data-hook-slot]')).toBeTruthy();
  });
});
