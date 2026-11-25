import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { BrandHeader } from '../../../app/components/product/BrandHeader';

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Image: ({ src, alt, className }: { src?: string; alt?: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

// hnoqa's Lindt brand: the editor saves the description as rich text.
const description =
  '<p class="ql-direction-rtl">علامة سويسرية تأسست عام 1845.</p><p><br></p>';

const brandSource = (desc?: string) =>
  ({
    type: 'brands',
    entity: { name: 'ليندت', logo: 'logo.png', banner: 'banner.png', description: desc },
  }) as never;

describe('BrandHeader', () => {
  // TD-17818: a <p> wrapper split around the description's own <p>s when the browser parsed the
  // server HTML, so the DOM no longer matched React's tree: hydration error #418.
  it("keeps a rich-text description inside its wrapper once a browser parses the server's HTML", () => {
    const html = renderToString(<BrandHeader source={brandSource(description)} />);
    const parsed = new DOMParser().parseFromString(html, 'text/html').body;
    const wrapper = parsed.querySelector('h1')!.nextElementSibling!;
    expect(wrapper.className).toBe('text-base text-gray-500 font-medium');
    expect(wrapper.innerHTML).toBe(description);
    // Nothing moved out beside it: the title and the description, as React rendered them.
    expect(Array.from(wrapper.parentElement!.children, (el) => el.tagName)).toEqual(['H1', 'DIV']);
  });

  it('strips scripts and event handlers from the merchant HTML', () => {
    const html = renderToString(
      <BrandHeader
        source={brandSource('<p>Lindt<img src="x" onerror="alert(1)"></p><script>alert(2)</script>')}
      />
    );
    expect(html).toContain('<p>Lindt<img src="x"></p>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
  });

  it('renders no description element without a description', () => {
    const html = renderToString(<BrandHeader source={brandSource()} />);
    expect(html).not.toContain('text-gray-500');
  });

  it('renders nothing on a page that is not a brand', () => {
    expect(renderToString(<BrandHeader source={{ type: 'categories' } as never} />)).toBe('');
  });
});
