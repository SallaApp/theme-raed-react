import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';

type Handler = (context: unknown) => React.ReactNode;
const handlers = new Map<string, Handler[]>();

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookName: {
    BODY_END: 'body:end',
    PRODUCT_DESCRIPTION: 'product:single.description',
    THANK_YOU_START: 'thank-you:start',
    THANK_YOU_ITEMS_START: 'thank-you:items.start',
    THANK_YOU_ITEMS_END: 'thank-you:items.end',
    THANK_YOU_PAYMENT_END: 'thank-you:payment.end',
    THANK_YOU_END: 'thank-you:end',
  },
  hookRegistry: {
    register: (name: string, handler: Handler) => {
      handlers.set(name, [...(handlers.get(name) ?? []), handler]);
    },
  },
}));

vi.mock('@salla.sa/twilight-theme-engine/home', () => ({
  PageBlocks: ({ hook, scope }: { hook: string; scope: unknown }) => (
    <div data-page-blocks={hook} data-scope={JSON.stringify(scope)} />
  ),
}));

vi.mock('../../app/components/cart', () => ({ AddProductToast: () => null }));
vi.mock('../../app/components/product', () => ({ DigitalFilesSettings: () => null }));

describe('thank-you page blocks', () => {
  beforeAll(async () => {
    const { registerThemeHooks } = await import('../../app/hooks');
    registerThemeHooks();
  });

  it.each([
    'thank-you:start',
    'thank-you:items.start',
    'thank-you:items.end',
    'thank-you:payment.end',
    'thank-you:end',
  ])("renders the merchant's blocks at %s, asked by hook alone", (hook) => {
    const [handler] = handlers.get(hook) ?? [];
    expect(handler).toBeTypeOf('function');

    const { container } = render(<>{handler({})}</>);
    const blocks = container.querySelector('[data-page-blocks]');
    expect(blocks?.getAttribute('data-page-blocks')).toBe(hook);
    expect(blocks?.getAttribute('data-scope')).toBe('{}');
  });
});
