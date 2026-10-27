import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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

/** What the chip shows for an option's current answer; `null` when it has none. */
function optionAnswer(option: PanelOption, added: string): ReactNode | null {
  const selected = option.details?.filter(isSelected) ?? [];
  if (selected.length) {
    return selected.map((detail, index) => (
      <span key={index} className="options-panel__answer">
        {detail.color && (
          <span
            className="options-panel__swatch"
            style={{ backgroundColor: detail.color }}
            aria-hidden="true"
          />
        )}
        {detail.name}
      </span>
    ));
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
    return (
      <span className="options-panel__answer">
        <span className="options-panel__swatch" style={{ backgroundColor: value }} aria-hidden="true" />
        {value}
      </span>
    );
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
  const [focusId, setFocusId] = useState<PanelOption['id'] | null>(null);
  // The shopper's answers since `options` last came in; `null` until they change one.
  const [live, setLive] = useState<PanelOption[] | null>(null);
  useEffect(() => setLive(null), [options]);

  // Follow every pick and keystroke inside the element.
  useEffect(() => {
    const container = fields.current;
    if (!container) return;
    const sync = () => {
      const form = container.closest('form');
      if (form) setLive(withFormAnswers(options, form));
    };
    // `changed` is the element's own event; `change`/`input` cover plain fields.
    const events = ['changed', 'change', 'input'];
    events.forEach((name) => container.addEventListener(name, sync));
    return () => events.forEach((name) => container.removeEventListener(name, sync));
  }, [options]);

  // Open on the chip's option, once the panel is showing.
  useEffect(() => {
    if (!expanded || focusId == null) return;
    const container = fields.current?.querySelector<HTMLElement>(
      `[data-option-id="${CSS.escape(String(focusId))}"]`
    );
    container?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    container?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    setFocusId(null);
  }, [expanded, focusId]);

  const added = t('blocks.product_options.added', 'Added');
  const chips = (live ?? options)
    .filter((option) => !SKIPPED_TYPES.has(option.type ?? ''))
    .map((option) => ({ option, answer: optionAnswer(option, added) }))
    // A conditional option the shopper hasn't reached yet has nothing to show.
    .filter(({ option, answer }) => answer !== null || !option.visibility_condition);

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
          <ul className="options-panel__chips">
            {chips.map(({ option, answer }) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`options-panel__chip${option.required && answer === null ? ' is-missing' : ''}`}
                  onClick={() => {
                    setFocusId(option.id);
                    setExpanded(true);
                  }}
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
