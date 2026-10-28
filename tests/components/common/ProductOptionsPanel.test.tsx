import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ProductOptionsPanel,
  type PanelOption,
} from '../../../app/components/common/ProductOptionsPanel';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const size: PanelOption = {
  id: 1,
  name: 'Size',
  type: 'single-option',
  required: true,
  details: [
    { id: 11, name: 'S', is_selected: false },
    { id: 12, name: 'M', is_selected: true },
  ],
};
const color: PanelOption = {
  id: 2,
  name: 'Color',
  type: 'color',
  required: false,
  details: [{ id: 21, name: 'Red', is_selected: true, color: '#f00' }],
};
const note: PanelOption = { id: 3, name: 'Note', type: 'text', required: false, value: 'Happy birthday' };
const location: PanelOption = { id: 4, name: 'Location', type: 'map', required: true, value: '24.7,46.6' };

const chipTexts = (container: HTMLElement) =>
  [...container.querySelectorAll('.options-panel__chip')].map((chip) => chip.textContent);
const fieldsHidden = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.options-panel__fields')!.hidden;

/** Stands in for what `<salla-product-options>` renders: one container per option. */
function OptionFields({ ids }: { ids: number[] }) {
  return (
    <div>
      {ids.map((id) => (
        <div key={id} data-option-id={id}>
          <input aria-label={`field-${id}`} name={`options[${id}]`} defaultValue="" />
        </div>
      ))}
    </div>
  );
}

describe('ProductOptionsPanel', () => {
  it('starts collapsed with a chip per option and its answer', () => {
    const { container } = render(
      <ProductOptionsPanel options={[size, color, note, location]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );

    expect(fieldsHidden(container)).toBe(true);
    expect(chipTexts(container)).toEqual([
      'SizeM',
      'Color',
      'NoteHappy birthday',
      'Locationblocks.product_options.added',
    ]);
  });

  it('shows a picked color as its circle alone, named for screen readers', () => {
    const picker: PanelOption = { id: 5, name: 'Ink', type: 'color_picker', value: '#00ff00' };
    const { container } = render(
      <ProductOptionsPanel options={[color, picker]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );

    expect(chipTexts(container)).toEqual(['Color', 'Ink']);
    const swatches = [...container.querySelectorAll('.options-panel__swatch')];
    expect(swatches.map((swatch) => swatch.getAttribute('aria-label'))).toEqual(['Red', '#00ff00']);
    expect(swatches[0].getAttribute('style')).toContain('background-color');
  });

  it('stays collapsed, and flags the chip, while a required option is unanswered', () => {
    const unanswered = { ...size, details: size.details!.map((d) => ({ ...d, is_selected: false })) };
    const { container } = render(
      <ProductOptionsPanel options={[unanswered]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );

    expect(fieldsHidden(container)).toBe(true);
    expect(container.querySelector('.options-panel__chip.is-missing')?.textContent).toBe(
      'Sizeblocks.product_options.required'
    );
  });

  it("reads the product page's preselected value when is_selected isn't sent", () => {
    const productSize = {
      ...size,
      details: [
        { id: 11, name: 'S', is_default: 0 },
        { id: 12, name: 'M', is_default: 1 },
      ],
    };
    const { container } = render(
      <ProductOptionsPanel options={[productSize]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );
    expect(chipTexts(container)).toEqual(['SizeM']);
  });

  it('keeps the options element mounted while collapsed, so the form still posts it', () => {
    const { container } = render(
      <ProductOptionsPanel options={[size]}>
        <salla-product-options options={JSON.stringify([size])} product-id={7} />
      </ProductOptionsPanel>
    );
    expect(container.querySelector('salla-product-options')?.getAttribute('product-id')).toBe('7');
  });

  it("opens on a chip's option and focuses its field", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { container } = render(
      <ProductOptionsPanel options={[size, note]}>
        <OptionFields ids={[1, 3]} />
      </ProductOptionsPanel>
    );

    fireEvent.click(screen.getByText('Note').closest('button')!);

    expect(fieldsHidden(container)).toBe(false);
    expect(document.activeElement).toBe(screen.getByLabelText('field-3'));
  });

  it("opens a picker option's picker from its chip, without a second press", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const ink: PanelOption = { id: 5, name: 'Ink', type: 'color_picker', value: '#00ff00' };
    const place: PanelOption = { id: 6, name: 'Place', type: 'map' };
    const { container } = render(
      <ProductOptionsPanel options={[ink, place]}>
        <div data-option-id="5">
          <salla-color-picker />
        </div>
        <div data-option-id="6">
          <salla-map />
        </div>
      </ProductOptionsPanel>
    );
    const openPicker = vi.fn(() => Promise.resolve());
    const openMap = vi.fn(() => Promise.resolve());
    Object.assign(container.querySelector('salla-color-picker')!, { openPicker });
    Object.assign(container.querySelector('salla-map')!, { open: openMap });

    fireEvent.click(screen.getByText('Ink').closest('button')!);
    expect(openPicker).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByLabelText('blocks.product_options.title'));
    fireEvent.click(screen.getByText('Place').closest('button')!);
    expect(openMap).toHaveBeenCalledOnce();
  });

  it("opens a dropdown's list from its chip", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const showPicker = vi.fn();
    HTMLSelectElement.prototype.showPicker = showPicker;
    render(
      <ProductOptionsPanel options={[size]}>
        <div data-option-id="1">
          <select aria-label="size" name="options[1]">
            <option value="11">S</option>
          </select>
        </div>
      </ProductOptionsPanel>
    );

    fireEvent.click(screen.getByText('Size').closest('button')!);

    expect(document.activeElement).toBe(screen.getByLabelText('size'));
    expect(showPicker).toHaveBeenCalledOnce();
  });

  it('scrolls an off-screen field to the middle, and opens it once the scroll ends', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    render(
      <ProductOptionsPanel options={[note]}>
        <OptionFields ids={[3]} />
      </ProductOptionsPanel>
    );
    const field = screen.getByLabelText('field-3');
    const container = field.closest<HTMLElement>('[data-option-id]')!;
    container.getBoundingClientRect = () =>
      ({ top: window.innerHeight + 200, bottom: window.innerHeight + 260 }) as DOMRect;

    fireEvent.click(screen.getByText('Note').closest('button')!);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    expect(document.activeElement).not.toBe(field);

    fireEvent(window, new Event('scrollend'));
    expect(document.activeElement).toBe(field);
  });

  it('shows one row of chips, and a "…" that opens the panel when more wrap below it', () => {
    // Stands in for the layout: the Note chip wraps to a second row.
    const offsetTop = vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get');
    offsetTop.mockImplementation(function (this: HTMLElement) {
      return this.tagName === 'LI' && this.textContent?.startsWith('Note') ? 44 : 0;
    });
    const { container } = render(
      <ProductOptionsPanel options={[size, color, note]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );
    offsetTop.mockRestore();

    const more = screen.getByLabelText('blocks.product_options.more');
    expect(screen.getByText('Note').closest('button')!.tabIndex).toBe(-1);
    expect(screen.getByText('Size').closest('button')!.tabIndex).toBe(0);

    fireEvent.click(more);
    expect(fieldsHidden(container)).toBe(false);
    expect(screen.queryByLabelText('blocks.product_options.more')).toBeNull();
  });

  it('shows no "…" when every chip fits on the first row', () => {
    render(
      <ProductOptionsPanel options={[size, note]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );
    expect(screen.queryByLabelText('blocks.product_options.more')).toBeNull();
  });

  it('toggles open and closed with the chevron', () => {
    const { container } = render(
      <ProductOptionsPanel options={[size]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );
    const toggle = screen.getByLabelText('blocks.product_options.title');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.options-panel__chips')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(chipTexts(container)).toEqual(['SizeM']);
  });

  it("follows the shopper's answers as they change them", () => {
    const { container } = render(
      <form>
        <ProductOptionsPanel options={[size, note]}>
          <div data-option-id="1">
            <select aria-label="size" name="options[1]" defaultValue="12">
              <option value="11">S</option>
              <option value="12">M</option>
            </select>
          </div>
          <div data-option-id="3">
            <input aria-label="note" name="options[3]" defaultValue="Happy birthday" />
          </div>
        </ProductOptionsPanel>
      </form>
    );

    fireEvent.change(screen.getByLabelText('size'), { target: { value: '11' } });
    fireEvent.input(screen.getByLabelText('note'), { target: { value: 'Congrats' } });

    expect(chipTexts(container)).toEqual(['SizeS', 'NoteCongrats']);
  });

  it('opens when the form flags an invalid field inside it', () => {
    const { container } = render(
      <form>
        <ProductOptionsPanel options={[size]}>
          <OptionFields ids={[1]} />
        </ProductOptionsPanel>
      </form>
    );
    const input = screen.getByLabelText('field-1') as HTMLInputElement;
    input.required = true;

    act(() => {
      input.form!.checkValidity();
    });
    expect(fieldsHidden(container)).toBe(false);
  });
});
