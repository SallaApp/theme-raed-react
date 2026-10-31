import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ProductMetadata } from '../../../app/components/product/ProductMetadata';

// `<salla-metadata>` renders plain-div spec groups: a header and its rows per box.
vi.mock('@salla.sa/twilight-components-react/metadata', () => ({
  SallaMetadata: () => (
    <div>
      {['Size', 'Material'].map((title) => (
        <div key={title} className="s-metadata-box">
          <div className="s-metadata-box-header">{title}</div>
          <div className="s-metadata-row">
            <p className="s-metadata-row-name">Name</p>
            <p className="s-metadata-row-value">Value</p>
          </div>
        </div>
      ))}
    </div>
  ),
}));

const headers = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.s-metadata-box-header'),
];

describe('ProductMetadata accordion', () => {
  it('makes every group header a keyboard-reachable button that says whether it is open', () => {
    const { container } = render(<ProductMetadata />);

    for (const header of headers(container)) {
      expect(header.getAttribute('role')).toBe('button');
      expect(header.tabIndex).toBe(0);
    }
    // The first group opens by itself.
    expect(headers(container).map((h) => h.getAttribute('aria-expanded'))).toEqual([
      'true',
      'false',
    ]);
  });

  it('opens and closes a group with Enter and Space', () => {
    const { container } = render(<ProductMetadata />);
    const second = headers(container)[1];

    fireEvent.keyDown(second, { key: 'Enter' });
    expect(second.parentElement!.classList.contains('is-open')).toBe(true);
    expect(second.getAttribute('aria-expanded')).toBe('true');

    // Space must not also scroll the page.
    const space = fireEvent.keyDown(second, { key: ' ' });
    expect(space).toBe(false);
    expect(second.parentElement!.classList.contains('is-open')).toBe(false);
    expect(second.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps aria-expanded in step with a mouse click', () => {
    const { container } = render(<ProductMetadata />);
    const first = headers(container)[0];

    fireEvent.click(first);

    expect(first.parentElement!.classList.contains('is-open')).toBe(false);
    expect(first.getAttribute('aria-expanded')).toBe('false');
  });

  it('ignores other keys', () => {
    const { container } = render(<ProductMetadata />);
    const second = headers(container)[1];

    fireEvent.keyDown(second, { key: 'a' });

    expect(second.getAttribute('aria-expanded')).toBe('false');
  });

  it('wires groups the component renders later, after its async spec fetch', async () => {
    const { container } = render(<ProductMetadata />);
    const box = document.createElement('div');
    box.className = 's-metadata-box';
    box.innerHTML = '<div class="s-metadata-box-header">Weight</div>';
    container.querySelector('.product-metadata > div')!.appendChild(box);

    // MutationObserver callbacks run as a microtask.
    await Promise.resolve();

    const late = box.querySelector<HTMLElement>('.s-metadata-box-header')!;
    expect(late.getAttribute('role')).toBe('button');
    expect(late.getAttribute('aria-expanded')).toBe('false');
    fireEvent.keyDown(late, { key: 'Enter' });
    expect(late.getAttribute('aria-expanded')).toBe('true');
  });
});
