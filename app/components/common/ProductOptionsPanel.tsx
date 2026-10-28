import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { CheckCircleIcon, ChevronDownIcon } from '../icons';

/**
 * A product option in the shape `<salla-product-options>` renders: what the cart
 * API sends for an item, and `product.options` on the product page.
 */
export interface PanelOption {
  id: number | string;
  name?: string;
  type?: string;
  required?: boolean;
  /** Typed answers: text, number, date, a color hex, a map's "lat,lng", a file URL. */
  value?: unknown;
  details?: {
    id?: number | string;
    name?: string;
    is_selected?: boolean;
    /** The product page's preselected value (1), when `is_selected` isn't sent. */
    is_default?: number | boolean;
    color?: string;
  }[];
  visibility_condition?: unknown;
}

/** Options whose `value` is a file or a place: shown as "added", not as the raw value. */
const ADDED_TYPES = new Set(['image', 'file', 'map']);
const COLOR_VALUE_TYPES = new Set(['color_picker']);
/** Layout-only options with nothing to sum up. */
const SKIPPED_TYPES = new Set(['splitter']);

/** `options[12]` and `options[12][]`, as the element names its inputs. */
const OPTION_FIELD = /^options\[([^\]]+)\](?:\[\])?$/;

const isSelected = (detail: NonNullable<PanelOption['details']>[number]) =>
  detail.is_selected ?? Number(detail.is_default) === 1;

/** A picked color as a circle alone, without its name or code. */
function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="options-panel__swatch"
      style={{ backgroundColor: color }}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}

/** What the chip shows for an option's current answer; `null` when it has none. */
function optionAnswer(option: PanelOption, added: string): ReactNode | null {
  const selected = option.details?.filter(isSelected) ?? [];
  if (selected.length) {
    return selected.map((detail, index) =>
      // A color shows as its circle alone; its name stays for screen readers and on hover.
      detail.color ? (
        <ColorSwatch key={index} color={detail.color} label={detail.name ?? detail.color} />
      ) : (
        <span key={index} className="options-panel__answer">
          {detail.name}
        </span>
      )
    );
  }

  const value = typeof option.value === 'number' ? String(option.value) : option.value;
  if (typeof value !== 'string' || !value.trim()) return null;
  if (ADDED_TYPES.has(option.type ?? '')) {
    return (
      <span className="options-panel__answer">
        <CheckCircleIcon className="options-panel__icon" aria-hidden="true" />
        {added}
      </span>
    );
  }
  if (COLOR_VALUE_TYPES.has(option.type ?? '')) {
    return <ColorSwatch color={value} label={value} />;
  }
  return <span className="options-panel__answer">{value}</span>;
}

/**
 * The options with the answers the form holds now: a choice is selected when its
 * id is among the option's values, any other option takes its first value. An
 * option with no field in the form (not rendered yet, or hidden by a condition)
 * keeps what it had.
 */
function withFormAnswers(options: PanelOption[], form: HTMLFormElement): PanelOption[] {
  const answers = new Map<string, string[]>();
  for (const [name, value] of new FormData(form)) {
    const id = OPTION_FIELD.exec(name)?.[1];
    if (id === undefined || typeof value !== 'string') continue;
    answers.set(id, [...(answers.get(id) ?? []), value]);
  }
  const fields = new Set(
    [...form.elements]
      .map((element) => OPTION_FIELD.exec((element as HTMLInputElement).name ?? '')?.[1])
      .filter((id): id is string => id !== undefined)
  );

  return options.map((option) => {
    const id = String(option.id);
    if (!fields.has(id)) return option;
    const values = answers.get(id) ?? [];
    if (option.details?.length) {
      return {
        ...option,
        details: option.details.map((detail) => ({
          ...detail,
          is_selected: values.includes(String(detail.id)),
        })),
      };
    }
    return { ...option, value: values.find((value) => value.trim()) ?? '' };
  });
}

/** The first control a shopper can type into or press, inside one option. */
const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** How long to wait for a smooth scroll to end where `scrollend` never fires. */
const SCROLL_FALLBACK_MS = 600;

type ColorPickerElement = HTMLElement & { openPicker?: () => Promise<void> };
type MapElement = HTMLElement & { open?: () => Promise<void> };

/**
 * Opens an option's field the way pressing it would: the color picker's popup, the
 * map's modal, the date picker's calendar, the file browser, the dropdown's list.
 * Any other field (text, radios, swatches) takes focus.
 */
function activateField(container: HTMLElement) {
  const colorPicker = container.querySelector<ColorPickerElement>('salla-color-picker');
  if (colorPicker?.openPicker) {
    void colorPicker.openPicker();
    return;
  }
  const map = container.querySelector<MapElement>('salla-map');
  if (map?.open) {
    void map.open();
    return;
  }
  // flatpickr opens on a click on its input.
  const dateInput = container.querySelector<HTMLInputElement>('salla-datetime-picker input');
  if (dateInput) {
    dateInput.focus({ preventScroll: true });
    dateInput.click();
    return;
  }
  const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (fileInput) {
    fileInput.click();
    return;
  }

  const field = container.querySelector<HTMLElement>(FOCUSABLE);
  field?.focus({ preventScroll: true });
  if (field instanceof HTMLSelectElement) {
    try {
      field.showPicker();
    } catch {
      // Not supported for a select (older Safari): focus is the next best thing.
    }
  }
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const inViewport = (element: HTMLElement) => {
  const { top, bottom } = element.getBoundingClientRect();
  return top >= 0 && bottom <= window.innerHeight;
};

/**
 * Scrolls `element` smoothly to the middle of the screen, then runs `then`, so a
 * popup opens where the field has settled, not where it was mid-scroll. A field
 * already on screen doesn't move, and `then` runs at once.
 */
function scrollToThen(element: HTMLElement, then: () => void) {
  if (inViewport(element)) {
    then();
    return;
  }
  const smooth = !prefersReducedMotion();
  element.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  if (!smooth) {
    then();
    return;
  }
  let timer = 0;
  const done = () => {
    window.removeEventListener('scrollend', done);
    window.clearTimeout(timer);
    then();
  };
  window.addEventListener('scrollend', done, { once: true });
  timer = window.setTimeout(done, SCROLL_FALLBACK_MS);
}

/**
 * Product options as a collapsible panel, collapsed at first. A row of chips sums
 * up each option and its answer, following the shopper's picks as they make
 * them; pressing a chip opens the panel and focuses that option's field.
 *
 * `children` is the `<salla-product-options>` element. It stays mounted while
 * collapsed, so the surrounding form still posts the options, and the panel
 * opens when the form's validation flags a field inside it.
 */
export function ProductOptionsPanel({
  options,
  children,
}: {
  options: PanelOption[];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const panelId = useId();
  const fields = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  // The shopper's answers, with the `options` they were read against: new `options`
  // (a cart refetch) replace them.
  const [live, setLive] = useState<{ from: PanelOption[]; options: PanelOption[] } | null>(null);
  const current = live?.from === options ? live.options : options;

  // Follow every pick and keystroke inside the element.
  useEffect(() => {
    const container = fields.current;
    if (!container) return;
    const sync = () => {
      const form = container.closest('form');
      if (form) setLive({ from: options, options: withFormAnswers(options, form) });
    };
    // `changed` is the element's own event; `change`/`input` cover plain fields.
    const events = ['changed', 'change', 'input'];
    events.forEach((name) => container.addEventListener(name, sync));
    return () => events.forEach((name) => container.removeEventListener(name, sync));
  }, [options]);

  // A chip opens the panel on its option: shown at once (a hidden field can't take
  // focus), scrolled to the middle of the screen, then its field opened, so the
  // shopper doesn't press it a second time.
  const openOn = (id: PanelOption['id']) => {
    flushSync(() => setExpanded(true));
    const container = fields.current?.querySelector<HTMLElement>(
      `[data-option-id="${CSS.escape(String(id))}"]`
    );
    if (container) scrollToThen(container, () => activateField(container));
  };

  const added = t('blocks.product_options.added', 'Added');
  const chips = current
    .filter((option) => !SKIPPED_TYPES.has(option.type ?? ''))
    .map((option) => ({ option, answer: optionAnswer(option, added) }))
    // A conditional option the shopper hasn't reached yet has nothing to show.
    .filter(({ option, answer }) => answer !== null || !option.visibility_condition);

  // Collapsed, the chips show one row (the CSS caps the list's height); the ones
  // wrapped below it are counted, and a "…" sits right after the last chip still
  // in sight. It's placed out of the flow (at `moreAt`, from the list's start
  // edge), with room kept for it at the row's end, so showing it never reflows
  // the chips back and forth.
  const chipList = useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = useState({ hidden: 0, moreAt: 0 });
  const chipsKey = chips.map(({ option }) => option.id).join(',');
  useLayoutEffect(() => {
    const list = chipList.current;
    if (!list) return;
    const measure = () => {
      const items = [...list.querySelectorAll<HTMLElement>(':scope > li[data-chip]')];
      const firstRow = items[0]?.offsetTop ?? 0;
      const shown = items.filter((item) => item.offsetTop <= firstRow);
      const hidden = items.length - shown.length;
      const last = shown.at(-1)?.getBoundingClientRect();
      const box = list.getBoundingClientRect();
      const rtl = getComputedStyle(list).direction === 'rtl';
      const moreAt = hidden && last ? Math.round(rtl ? box.right - last.left : last.right - box.left) : 0;
      setOverflow((now) =>
        now.hidden === hidden && now.moreAt === moreAt ? now : { hidden, moreAt }
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [expanded, chipsKey]);
  const firstHidden = chips.length - overflow.hidden;

  const title = t('blocks.product_options.title', 'Product options');

  return (
    <div
      className="options-panel"
      data-expanded={expanded}
      // A hidden field can't show its validation message: open, then ask again.
      onInvalidCapture={(event) => {
        if (expanded) return;
        const form = (event.target as HTMLInputElement).form;
        setExpanded(true);
        window.requestAnimationFrame(() => form?.reportValidity());
      }}
    >
      <div className="options-panel__header">
        {expanded ? (
          <span className="options-panel__title">{title}</span>
        ) : (
          <ul
            ref={chipList}
            className={`options-panel__chips${overflow.hidden ? ' has-more' : ''}`}
          >
            {chips.map(({ option, answer }, index) => (
              <li key={option.id} data-chip>
                <button
                  type="button"
                  className={`options-panel__chip${option.required && answer === null ? ' is-missing' : ''}`}
                  // Out of sight below the first row: not a tab stop either.
                  tabIndex={index >= firstHidden ? -1 : undefined}
                  onClick={() => openOn(option.id)}
                >
                  <span className="options-panel__name">{option.name}</span>
                  {answer ??
                    (option.required && (
                      <span className="options-panel__answer">
                        {t('blocks.product_options.required', 'Required')}
                      </span>
                    ))}
                </button>
              </li>
            ))}
            {overflow.hidden > 0 && (
              <li className="options-panel__more-item" style={{ insetInlineStart: overflow.moreAt }}>
                <button
                  type="button"
                  className="options-panel__more"
                  aria-label={t('blocks.product_options.more', 'Show all options')}
                  title={t('blocks.product_options.more', 'Show all options')}
                  onClick={() => setExpanded(true)}
                >
                  …
                </button>
              </li>
            )}
          </ul>
        )}
        <button
          type="button"
          className="options-panel__toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={title}
          onClick={() => setExpanded((open) => !open)}
        >
          <ChevronDownIcon className="options-panel__icon" aria-hidden="true" />
        </button>
      </div>

      <div id={panelId} ref={fields} className="options-panel__fields" hidden={!expanded}>
        {children}
      </div>
    </div>
  );
}
