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

  it("scrolls the color picker's popup fully on screen once it opens, keeping the label in sight", async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    const scrollBy = vi.fn();
    window.scrollBy = scrollBy as typeof window.scrollBy;
    const ink: PanelOption = { id: 5, name: 'Ink', type: 'color_picker', value: '#00ff00' };
    const { container } = render(
      <ProductOptionsPanel options={[ink]}>
        <div data-option-id="5">
          <salla-color-picker>
            <div className="picker_wrapper popup" />
          </salla-color-picker>
        </div>
      </ProductOptionsPanel>
    );
    Object.assign(container.querySelector('salla-color-picker')!, {
      openPicker: () => Promise.resolve(),
    });
    // The field is on screen at 500px; its popup ends 200px past the bottom.
    container.querySelector<HTMLElement>('[data-option-id="5"]')!.getBoundingClientRect = () =>
      ({ top: 500, bottom: 560, height: 60 }) as DOMRect;
    container.querySelector<HTMLElement>('.picker_wrapper')!.getBoundingClientRect = () =>
      ({ bottom: window.innerHeight + 200 }) as DOMRect;

    // Pressed right where the option already sits: no scroll before it opens.
    fireEvent.click(screen.getByText('Ink').closest('button')!, { detail: 1, clientY: 530 });

    await vi.waitFor(() =>
      expect(scrollBy).toHaveBeenCalledWith({ top: 216, behavior: 'smooth' })
    );
    expect(scrollBy).toHaveBeenCalledOnce();
  });

  it("opens a dropdown's list from its chip", () => {
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

  it('scrolls the field under the pointer that pressed the chip, and opens it once the scroll ends', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    const scrollBy = vi.fn();
    window.scrollBy = scrollBy as typeof window.scrollBy;
    render(
      <ProductOptionsPanel options={[note]}>
        <OptionFields ids={[3]} />
      </ProductOptionsPanel>
    );
    const field = screen.getByLabelText('field-3');
    // The opened field sits at 400–440px; the shopper pressed the chip at 100px.
    field.getBoundingClientRect = () => ({ top: 400, height: 40 }) as DOMRect;

    fireEvent.click(screen.getByText('Note').closest('button')!, { detail: 1, clientY: 100 });
    expect(scrollBy).toHaveBeenCalledWith({ top: 320, behavior: 'smooth' });
    expect(document.activeElement).not.toBe(field);

    fireEvent(window, new Event('scrollend'));
    expect(document.activeElement).toBe(field);
  });

  it('aims at the chip itself when it is pressed from the keyboard', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    const scrollBy = vi.fn();
    window.scrollBy = scrollBy as typeof window.scrollBy;
    render(
      <ProductOptionsPanel options={[note]}>
        <OptionFields ids={[3]} />
      </ProductOptionsPanel>
    );
    const chip = screen.getByText('Note').closest('button')!;
    chip.getBoundingClientRect = () => ({ top: 80, height: 40 }) as DOMRect;
    screen.getByLabelText('field-3').getBoundingClientRect = () =>
      ({ top: 400, height: 40 }) as DOMRect;

    fireEvent.click(chip, { detail: 0 });
    expect(scrollBy).toHaveBeenCalledWith({ top: 320, behavior: 'smooth' });
  });

  it('shows one row of chips, and a "…" that opens the panel when more wrap below it', () => {
    // Stands in for the layout: the Note chip wraps to a second row.
    const offsetTop = vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get');
    offsetTop.mockImplementation(function (this: HTMLElement) {
      return this.tagName === 'LI' && this.textContent?.startsWith('Note') ? 44 : 0;
    });
    // The last chip in sight (Color) ends 300px from the list's start edge.
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    rect.mockImplementation(function (this: Element) {
      const right = this.tagName === 'LI' && this.textContent === 'Color' ? 300 : 0;
      return { left: 0, right } as DOMRect;
    });
    const { container } = render(
      <ProductOptionsPanel options={[size, color, note]}>
        <OptionFields ids={[]} />
      </ProductOptionsPanel>
    );
    offsetTop.mockRestore();
    rect.mockRestore();

    const more = screen.getByLabelText('blocks.product_options.more');
    // Right after the last chip in sight, not at the far end of the row.
    expect(more.closest('li')!.style.insetInlineStart).toBe('300px');
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
