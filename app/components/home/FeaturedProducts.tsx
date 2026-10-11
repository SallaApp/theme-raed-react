import { Suspense, useCallback, useMemo, useState } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product } from '@salla.sa/twilight-theme-engine/api/product';
import { ProductCard } from '../product/ProductCard';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';

/**
 * `featured-products` home block — products grid with category tabs, and an
 * optional highlighted "special" product.
 *
 * Why the theme owns the render instead of delegating to the engine:
 *  - the engine only pre-registers `featured-products:style1|style2|style3` and
 *    only recognises those literal `view_style` values, so the semantic values
 *    the API now sends (`products_without_special_product`, …) hit the bare
 *    `home:featured-products` key unhandled → dev "Unknown component" box;
 *  - the engine's `FeaturedProductsStyle1` / `Style3` render each product as a
 *    raw `<custom-salla-product-card>` web component, which nothing defines in a
 *    React theme — the markup mounts but shows nothing (the "empty block").
 *
 * This component keeps the engine/Twig class names (`s-block__title`, `tabs`,
 * `tabs-wrapper`, `tabs__item`, `tab-trigger`) so `04-components/home-blocks.scss`
 * styles it, and renders through the real React `ProductCard`.
 *
 * `items[].products` from `component/list` are summary stubs (`id`, `name`,
 * `price` only) — no stock / status / image — so rendering them directly shows
 * every card as "out of stock". Each tab therefore re-fetches its products in
 * full by id (`product.list({ source: 'selected', … })`).
 *
 * {@link featuredProductsConfig} supplies the wrapper `<section>` classes.
 */

export interface FeaturedProductsSection {
  id?: string | number;
  /** Tab name from the store API (`component/list`) — the real field is `label`. */
  label?: string;
  title?: string;
  name?: string;
  type?: string;
  products?: Array<Pick<Product, 'id'> & Record<string, unknown>>;
  [key: string]: unknown;
}

export interface FeaturedProductsData {
  view_style?: string | null;
  title?: string;
  is_slider?: boolean;
  position?: number;
  main_product?: { title?: string; product?: Product | null } | null;
  items?: FeaturedProductsSection[];
  [key: string]: unknown;
}

type Translate = ReturnType<typeof useTranslation>['t'];

interface Tab {
  key: string;
  label: string;
  productIds: number[];
}

/** Stable key for a tab section — the API sometimes omits `id`. */
const sectionKey = (section: FeaturedProductsSection | undefined, index: number) =>
  section?.id !== undefined && section.id !== '' ? String(section.id) : `section-${index}`;

const sectionProductIds = (section: FeaturedProductsSection): number[] =>
  (Array.isArray(section.products) ? section.products : [])
    .map((p) => Number(p?.id))
    .filter((id) => Number.isFinite(id));

/**
 * Visible tab label. The store API (`component/list`) sends the merchant-set tab
 * name in `label` (older/Twig payloads used `title` / `name`). If none are set,
 * fall back to a humanised `type`, then to a numbered placeholder, so the tab bar
 * never collapses to zero-width empty buttons.
 */
function tabLabel(section: FeaturedProductsSection, index: number, t: Translate): string {
  const explicit = (section.label || section.title || section.name || '').trim();
  if (explicit) return explicit;

  const type = typeof section.type === 'string' ? section.type.trim() : '';
  if (type) return type.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return `${t('blocks.home.featured_products_tab', 'Products')} ${index + 1}`;
}

/**
 * Full-bleed pill tab bar. One row for every breakpoint — it scrolls
 * horizontally when the tabs overflow. Styling lives in `home-blocks.scss`
 * under `.s-block--featured-products .tabs` / `.tab-trigger`.
 */
function TabTriggers({
  tabs,
  active,
  onSelect,
}: {
  tabs: Tab[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="tabs hide-scroll">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={`tab-trigger ${active === tab.key ? 'is-active' : ''}`}
        >
          <span className="s-button-text">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * One tab's product grid. Re-fetches the tab's products in full by id, so the
 * cards get real stock / price / images instead of the "out of stock" summary
 * stubs the home API sends in `items[].products`.
 */
function TabProductGrid({ ids, limit }: { ids: number[]; limit: number }) {
  const loader = useCallback(
    () => product.list({ source: 'selected', sourceValue: ids, perPage: ids.length || limit }),
    [ids, limit]
  );

  if (!ids.length) return null;

  return (
    <Suspense fallback={<ProductsListSkeleton />}>
      <SallaProductsList loader={loader} itemsClassName="s-products-list-vertical-cards">
        {(items: Product[]) =>
          items.slice(0, limit).map((item) => <ProductCard key={item.id} product={item} />)
        }
      </SallaProductsList>
    </Suspense>
  );
}

export function FeaturedProducts({ data }: { data: FeaturedProductsData }) {
  const { t } = useTranslation();
  const sections = useMemo(() => (Array.isArray(data.items) ? data.items : []), [data.items]);
  const [active, setActive] = useState(() => sectionKey(sections[0], 0));

  // Stable per-tab id lists so `TabProductGrid`'s loader isn't rebuilt each render.
  const tabIds = useMemo(() => sections.map(sectionProductIds), [sections]);

  if (!sections.length) return null;

  const tabs: Tab[] = sections.map((section, index) => ({
    key: sectionKey(section, index),
    label: tabLabel(section, index, t),
    productIds: tabIds[index] ?? [],
  }));

  const specialProduct = data.main_product?.product ?? null;
  const hasTabs = tabs.length > 1;
  const heading = data.main_product?.title || data.title || '';
  const perTab = specialProduct ? 4 : 8;

  return (
    <>
      {heading && (
        <h2 className="s-block__title text-center text-lg font-semibold mb-4">{heading}</h2>
      )}

      {hasTabs && <TabTriggers tabs={tabs} active={active} onSelect={setActive} />}

      <div className={`grid grid-cols-1 gap-8 ${specialProduct ? 'lg:grid-cols-2' : ''}`}>
        {specialProduct && (
          <div className="flex flex-col">
            <ProductCard product={specialProduct} layout="special" withShadow />
          </div>
        )}

        <div className="tabs-wrapper flex flex-1 flex-col">
          {tabs.map((tab) => (
            <div key={tab.key} className={`tabs__item ${active === tab.key ? 'is-active' : ''}`}>
              <TabProductGrid ids={tab.productIds} limit={perTab} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** True for the multi-section grid layout (`style3`). */
const isGridStyle = (style: string) => style.includes('3') || style === 'grid';

/** True for the full-bg tabbed-products layout (`style2`). */
const isTabbedStyle = (style: string) =>
  style.includes('2') || style === 'tabs' || style === 'slider' || style === 'products';

/**
 * Wrapper-`<section>` render config, registered via `registerHomeComponentConfig`
 * so it replaces the engine's `style1/2/3`-only className switch (the engine only
 * styles the literal `styleN` values). `tabs-initialized` keeps the tab CSS from
 * hiding non-first panels; the pill tab bar is styled off `s-block--featured-products`.
 */
export const featuredProductsConfig = {
  height: '450px',
  id: (data: FeaturedProductsData) =>
    `featured-products-${data.view_style ?? 'default'}-${data.position ?? 0}`,
  className: (data: FeaturedProductsData) => {
    const style = String(data.view_style ?? '').toLowerCase();
    const base = 's-block s-block--featured-products s-block-tabs tabs-initialized';

    if (isGridStyle(style)) {
      const twoCols = Array.isArray(data.items) && data.items.length > 1 ? ' two-cols' : '';
      return `${base} s-block--features-products${twoCols} container`;
    }
    if (isTabbedStyle(style)) {
      return `${base} s-block--tabs-produtcs bg-gray-100 py-8 sm:py-16 ${
        data.is_slider ? 'as-slider' : 'as-grid'
      }`;
    }
    return `${base} container`;
  },
};
