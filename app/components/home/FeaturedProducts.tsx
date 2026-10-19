import { Suspense, useCallback, useMemo, useState } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { ProductCard } from '../product';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';

/**
 * `featured-products` home block — a theme-owned custom component (declared in
 * `twilight.json` as `home.featured-products`), replacing the engine's native
 * `component-featured-products` feature. Each tab names its own source
 * (`items[].type` + category / tag / chosen products) and loads its products
 * lazily through `product.list`, so no server-side hydration is needed.
 *
 * Keeps the engine/Twig class names (`s-block__title`, `tabs`, `tabs-wrapper`,
 * `tabs__item`, `tab-trigger`) so `04-components/home-blocks.scss` styles it.
 * {@link featuredProductsConfig} supplies the wrapper `<section>` classes.
 *
 * Its three layouts are separate blocks: `featured-products` (tabs only),
 * `featured-products-special-offer` and `featured-products-special-product`.
 * The older combined block chose one through `show_method`, which saved blocks
 * may still carry, so `featured-products` keeps honoring it.
 */

const TYPE_TO_SOURCE: Record<string, ProductsListSource> = {
  category: 'categories',
  most_sales: 'sales',
  latest_products: 'latest',
  chosen_products: 'selected',
  top_rated_products: 'top-rated',
  tag: 'tags',
};

/** The block's layouts; each is its own home block (see {@link FeaturedProductsSpecialOffer}). */
export type FeaturedProductsShowMethod =
  | 'products_without_special_product'
  | 'special_offer_with_products'
  | 'products_with_special_product';

/** A dropdown-list value as the backend may send it: scalar, `{value|key|id}`, or an array of those. */
type PickerValue = string | number | { id?: unknown; value?: unknown; key?: unknown } | null | undefined;

export interface FeaturedProductsSection {
  name?: string;
  /** Legacy (pre-custom-component) payload: tab name and pre-hydrated stubs. */
  label?: string;
  title?: string;
  products?: Array<{ id?: unknown }>;
  type?: PickerValue | PickerValue[];
  category?: PickerValue | PickerValue[];
  tag?: PickerValue | PickerValue[];
  chosen_products?: PickerValue | PickerValue[] | { source_value?: PickerValue[] } | null;
  special_product?: Product | { source_value?: PickerValue[] } | PickerValue | PickerValue[] | null;
  [key: string]: unknown;
}

export interface FeaturedProductsData {
  view_style?: string | null;
  show_method?: PickerValue | PickerValue[];
  is_slider?: boolean;
  position?: number;
  main_product_title?: string;
  /** Legacy payload heading. */
  title?: string;
  main_product?: Product | { source_value?: PickerValue[] } | PickerValue | PickerValue[] | null;
  items?: FeaturedProductsSection[];
  [key: string]: unknown;
}

type Translate = ReturnType<typeof useTranslation>['t'];

interface Tab {
  key: string;
  label: string;
  source?: ProductsListSource;
  sourceValue?: number[];
}

const scalar = (v: unknown): string => {
  if (Array.isArray(v)) return scalar(v[0]);
  if (v && typeof v === 'object') {
    const o = v as { value?: unknown; key?: unknown; id?: unknown };
    return scalar(o.value ?? o.key ?? o.id);
  }
  return v === null || v === undefined ? '' : String(v);
};

const toIds = (v: unknown): number[] => {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'source_value' in v) {
    return toIds((v as { source_value?: unknown }).source_value);
  }
  return (Array.isArray(v) ? v : v === null || v === undefined || v === '' ? [] : [v])
    .map((x) => Number(scalar(x)))
    .filter((id) => Number.isFinite(id) && id > 0);
};

/** Maps one merchant-configured tab to the `product.list` source it should load. */
function resolveTab(section: FeaturedProductsSection): Pick<Tab, 'source' | 'sourceValue'> {
  if (Array.isArray(section.products)) {
    return { source: 'selected', sourceValue: toIds(section.products.map((p) => p?.id)) };
  }
  const source = TYPE_TO_SOURCE[scalar(section.type)];
  if (!source) return {};
  if (source === 'selected') return { source, sourceValue: toIds(section.chosen_products) };
  if (source === 'categories') return { source, sourceValue: toIds(section.category) };
  if (source === 'tags') return { source, sourceValue: toIds(section.tag) };
  return { source };
}

const needsValue = (source: ProductsListSource) =>
  source === 'selected' || source === 'categories' || source === 'tags';

const isValidTab = (tab: Tab) =>
  !!tab.source && (!needsValue(tab.source) || !!tab.sourceValue?.length);

const isFullProduct = (v: unknown): v is Product =>
  !!v && typeof v === 'object' && !Array.isArray(v) && 'name' in v && 'id' in v;

function tabLabel(section: FeaturedProductsSection, index: number, t: Translate): string {
  const explicit = (section.name || section.label || section.title || '').trim();
  return explicit || `${t('blocks.home.featured_products_tab', 'Products')} ${index + 1}`;
}

function TabTriggers({
  tabs,
  active,
  onSelect,
  className = '',
}: {
  tabs: Tab[];
  active: string;
  onSelect: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`tabs hide-scroll ${className}`}>
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

/** One tab's product grid, loaded lazily from the tab's configured source. */
function TabProductGrid({
  source,
  sourceValue,
  limit,
  layout = 'vertical',
}: {
  source: ProductsListSource;
  sourceValue?: number[];
  limit: number;
  layout?: 'vertical' | 'horizontal';
}) {
  const loader = useCallback(
    () => product.list({ source, sourceValue, perPage: limit }),
    [source, sourceValue, limit]
  );

  return (
    <Suspense fallback={<ProductsListSkeleton />}>
      <SallaProductsList loader={loader} itemsClassName={`s-products-list-${layout}-cards`}>
        {(items: Product[]) =>
          items
            .slice(0, limit)
            .map((item) => <ProductCard key={item.id} product={item} layout={layout} />)
        }
      </SallaProductsList>
    </Suspense>
  );
}

/** Highlighted product: used as-is when hydrated, otherwise fetched by id. */
function SpecialProduct({ value }: { value: FeaturedProductsData['main_product'] }) {
  const ids = isFullProduct(value) ? [] : toIds(value);
  const loader = useCallback(() => product.list({ source: 'selected', sourceValue: ids, perPage: 1 }), [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isFullProduct(value)) return <ProductCard product={value} layout="special" withShadow />;
  if (!ids.length) return null;

  return (
    <Suspense fallback={<ProductsListSkeleton />}>
      <SallaProductsList loader={loader} itemsClassName="featured-products__special-list">
        {(items: Product[]) =>
          items
            .slice(0, 1)
            .map((item) => <ProductCard key={item.id} product={item} layout="special" withShadow />)
        }
      </SallaProductsList>
    </Suspense>
  );
}

export function FeaturedProducts({
  data,
  showMethod: fixedShowMethod,
}: {
  data: FeaturedProductsData;
  /** Set by the single-layout blocks; otherwise the layout comes from `data.show_method`. */
  showMethod?: FeaturedProductsShowMethod;
}) {
  const { t } = useTranslation();
  const sections = useMemo(() => (Array.isArray(data.items) ? data.items : []), [data.items]);
  const [active, setActive] = useState('0');

  const tabs: Tab[] = useMemo(
    () =>
      sections.map((section, index) => ({
        key: String(index),
        label: tabLabel(section, index, t),
        ...resolveTab(section),
      })),
    [sections, t]
  );

  if (!sections.length) return null;

  const showMethod = fixedShowMethod ?? scalar(data.show_method);
  const legacySpecial =
    data.main_product && typeof data.main_product === 'object' && 'product' in data.main_product
      ? (data.main_product as { product?: Product | null }).product
      : null;

  if (showMethod === 'products_with_special_product' && !legacySpecial) {
    return <SpecialProductColumns sections={sections} tabs={tabs} />;
  }

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === active));
  const specialValue =
    legacySpecial ?? (showMethod === 'special_offer_with_products' ? data.main_product : null);
  const hasSpecial = isFullProduct(specialValue) || toIds(specialValue).length > 0;
  const hasTabs = tabs.length > 1;
  const mainTitle =
    data.main_product && typeof data.main_product === 'object' && 'title' in data.main_product
      ? (data.main_product as { title?: string }).title
      : '';
  const heading =
    mainTitle ||
    (showMethod === 'special_offer_with_products' ? data.main_product_title : '') ||
    data.title;
  // 2×2 beside the special product; otherwise two full rows of five.
  const perTab = hasSpecial ? 4 : 10;
  const triggers = hasTabs && (
    <TabTriggers
      tabs={tabs}
      active={String(activeIndex)}
      onSelect={setActive}
      className={hasSpecial ? 'tabs--inline' : ''}
    />
  );

  return (
    <>
      {hasSpecial ? (
        // Title at the start, tabs at the end of the same row.
        (heading || triggers) && (
          <div className="featured-products__header">
            {heading && <h2 className="s-block__title text-lg font-semibold">{heading}</h2>}
            {triggers}
          </div>
        )
      ) : (
        <>
          {heading && (
            <h2 className="s-block__title text-center text-lg font-semibold mb-4">{heading}</h2>
          )}
          {triggers}
        </>
      )}

      <div
        className={`featured-products__layout grid grid-cols-1 gap-8 ${hasSpecial ? 'has-special lg:grid-cols-2' : ''}`}
      >
        {hasSpecial && (
          <div className="featured-products__special flex flex-col">
            <SpecialProduct value={specialValue} />
          </div>
        )}

        <div className="tabs-wrapper flex flex-1 flex-col">
          {tabs.map((tab, index) => (
            <div key={tab.key} className={`tabs__item ${activeIndex === index ? 'is-active' : ''}`}>
              {isValidTab(tab) && (
                <TabProductGrid
                  source={tab.source as ProductsListSource}
                  sourceValue={tab.sourceValue}
                  limit={perTab}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * `products_with_special_product`: every section side by side (no tab switching),
 * each under its own title with its featured product beside three list cards.
 */
function SpecialProductColumns({
  sections,
  tabs,
}: {
  sections: FeaturedProductsSection[];
  tabs: Tab[];
}) {
  return (
    <div
      className={`featured-products__columns grid grid-cols-1 gap-8 ${tabs.length > 1 ? 'lg:grid-cols-2' : ''}`}
    >
      {tabs.map((tab, index) => {
        const special = sections[index]?.special_product;
        const hasSpecial = isFullProduct(special) || toIds(special).length > 0;
        return (
          <div key={tab.key} className="featured-products__column">
            <h2 className="s-block__title text-lg font-semibold">{tab.label}</h2>
            <div
              className={`featured-products__column-body grid grid-cols-1 gap-4 ${hasSpecial ? 'has-special sm:grid-cols-2' : ''}`}
            >
              {hasSpecial && (
                <div className="featured-products__special flex flex-col">
                  <SpecialProduct value={special} />
                </div>
              )}
              {isValidTab(tab) &&
                (hasSpecial ? (
                  <TabProductGrid
                    source={tab.source as ProductsListSource}
                    sourceValue={tab.sourceValue}
                    limit={3}
                    layout="horizontal"
                  />
                ) : (
                  <ColumnFromSource
                    source={tab.source as ProductsListSource}
                    sourceValue={tab.sourceValue}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A column with no featured product picked: its source's first product is
 * featured and the next three are listed beside it, laid out by the list's
 * own grid (`.featured-products__column-grid`).
 */
function ColumnFromSource({
  source,
  sourceValue,
}: {
  source: ProductsListSource;
  sourceValue?: number[];
}) {
  const loader = useCallback(
    () => product.list({ source, sourceValue, perPage: 4 }),
    [source, sourceValue]
  );

  return (
    <Suspense fallback={<ProductsListSkeleton />}>
      <SallaProductsList
        loader={loader}
        itemsClassName="s-products-list-horizontal-cards featured-products__column-grid"
      >
        {(items: Product[]) =>
          items
            .slice(0, 4)
            .map((item, index) =>
              index === 0 ? (
                <ProductCard key={item.id} product={item} layout="special" withShadow />
              ) : (
                <ProductCard key={item.id} product={item} layout="horizontal" />
              )
            )
        }
      </SallaProductsList>
    </Suspense>
  );
}

/** `featured-products-special-offer` home block: a discounted product and its title beside the tabs. */
export function FeaturedProductsSpecialOffer({ data }: { data: FeaturedProductsData }) {
  return <FeaturedProducts data={data} showMethod="special_offer_with_products" />;
}

/** `featured-products-special-product` home block: sections side by side, each with its own featured product. */
export function FeaturedProductsWithSpecialProduct({ data }: { data: FeaturedProductsData }) {
  return <FeaturedProducts data={data} showMethod="products_with_special_product" />;
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
