import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useStore } from '@salla.sa/twilight-theme-engine/hooks/useStore';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useNavigate, useLocation, useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { sortOptions, onSallaEvent } from '@salla.sa/twilight-theme-engine/utils';
import {
  Breadcrumb,
  NoContent,
  ProductCardSkeleton,
  Image,
  RenderWhenVisible,
} from '@salla.sa/twilight-theme-engine/common';
import { SallaFilters } from '@salla.sa/twilight-components-react/filters';
import {
  ItemsList,
  ReviewItemSkeleton,
  type ItemsLoaderFn,
} from '@salla.sa/twilight-components-react';
import { Testimonials, useReorderButtons } from '@salla.sa/twilight-theme-engine/home';
import { product, parseNextPageToken } from '@salla.sa/twilight-theme-engine/api/product';
import type { ProductListLoaderData } from '@salla.sa/twilight-theme-engine/routes/product-listing';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { ProductCard } from './ProductCard';
import { useAppliedFilters } from '@salla.sa/twilight-theme-engine/routes/product-listing';
import type { ProductListFilters } from '@salla.sa/twilight-theme-engine/api/product';
import { BlockHookSlot } from '../common/BlockHookSlot';
import { BottomSheet } from '../common/BottomSheet';
import {
  ChevronDownIcon,
  DashboardSquare01Icon,
  FilterHorizontalIcon,
  RightToLeftListBulletIcon,
} from '../icons';

type View = 'grid' | 'list';

/** localStorage-backed toolbar preference, read after mount to avoid SSR mismatch. */
function usePref<T extends string>(
  key: string,
  values: readonly T[],
  initial: T
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key) as T | null;
      // This fills the hook's own state from localStorage; no parent is
      // involved: see .react-doctor/false-positives.md.
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent
      if (stored && values.includes(stored)) setValue(stored);
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v);
      } catch {
        /* private mode */
      }
    },
    [key]
  );
  return [value, set];
}

/** `ItemsList`'s `loader` for infinite scroll - the route already loaded the
 * first page, so this fetches subsequent ones from `pagination.next`, which
 * `parseNextPageToken` reads as either a bare cursor token or (sources
 * without true cursor pagination, e.g. `offers`) a full next-page URL. */
function useCatalogLoader(
  source: ProductListLoaderData['source'],
  selectedSort: string,
  next: string | null | undefined,
  filters: ProductListFilters | null
): ItemsLoaderFn<Product> {
  const nextCursorRef = useRef<string | null>(next ?? null);
  useEffect(() => {
    nextCursorRef.current = next ?? null;
  }, [next]);

  return useCallback(async () => {
    const { cursor, page } = parseNextPageToken(nextCursorRef.current);
    const result = await product.list({
      source: source.type,
      sourceValue: source.value,
      ...(cursor && { cursor }),
      ...(page !== undefined && { page }),
      sort: selectedSort,
      ...(filters && { filterable: true, filters }),
    });
    nextCursorRef.current = result.next;
    return result;
  }, [source.type, source.value, selectedSort, filters]);
}

type BrandEntity = { name: string; banner?: string; logo?: string; description?: string };

/** Banner + logo + description above the listing, for a `/brands/{id}` page. Renders
 * nothing for any other source type. */
function BrandHeader({ source }: { source: ProductListLoaderData['source'] }) {
  if (source.type !== 'brands') return null;
  const brand = source.entity as BrandEntity | undefined;
  if (!brand) return null;

  return (
    <>
      <Image
        width={1200}
        height={300}
        className="w-full max-h-[300px] object-cover rounded bg-gray-100"
        src={brand.banner || undefined}
        alt={brand.name}
        priority
      />
      <header className="flex flex-col md:flex-row items-center md:items-start text-center rtl:md:text-right ltr:md:text-left mt-2 mb-8">
        <Image
          className="rounded w-40 h-24 object-contain shadow-md p-4 bg-white shrink-0"
          src={brand.logo || undefined}
          alt={brand.name}
          aspectRatio="5/3"
        />
        <div className="px-5 pt-3 rtl:text-right">
          <h1 className="text-2xl font-bold mb-1">{brand.name}</h1>
          {brand.description && (
            <p
              className="text-base text-gray-500 font-medium"
              dangerouslySetInnerHTML={{ __html: brand.description }}
            />
          )}
        </div>
      </header>
    </>
  );
}

/** Filter show/hide (desktop toggle + mobile trigger) at the start, product
 * count + grid/list switch + sort select at the end. */
function CatalogToolbar({
  showFilters,
  filtersHidden,
  onToggleFiltersHidden,
  onOpenMobileFilters,
  productsCount,
  view,
  onViewChange,
  selectedSort,
  sortOptionsWithTrans,
  currentSortLabel,
  onSortChange,
}: {
  showFilters: boolean;
  filtersHidden: '0' | '1';
  onToggleFiltersHidden: () => void;
  onOpenMobileFilters: () => void;
  /** `undefined` when the true total isn't known (more pages beyond this
   * one) — the API is cursor-paginated with no total-count field, so
   * `products.length` is only accurate once there's nothing left to load. */
  productsCount: number | undefined;
  view: View;
  onViewChange: (view: View) => void;
  selectedSort: string;
  sortOptionsWithTrans: ReturnType<typeof sortOptions>;
  currentSortLabel: string | undefined;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="s-catalog-toolbar">
      {showFilters && (
        <div className="s-catalog-toolbar__group s-catalog-toolbar__filters">
          <button
            type="button"
            className="s-catalog-toolbar__filters-toggle hidden md:inline-flex"
            aria-pressed={filtersHidden === '1'}
            onClick={onToggleFiltersHidden}
          >
            <FilterHorizontalIcon aria-hidden="true" />
            {filtersHidden === '1'
              ? t('blocks.catalog.show_filters', 'Show filters')
              : t('blocks.catalog.hide_filters', 'Hide filters')}
          </button>

          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="s-catalog-toolbar__filters-trigger md:hidden"
            aria-label={t('pages.categories.filters', 'Filters')}
          >
            <FilterHorizontalIcon aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="s-catalog-toolbar__group s-catalog-toolbar__options">
        {productsCount !== undefined && (
          <span className="s-catalog-toolbar__count hidden sm:inline">
            {productsCount} {t('blocks.catalog.products_count', 'products')}
          </span>
        )}

        <div
          className="s-catalog-toolbar__views"
          role="group"
          aria-label={t('blocks.catalog.view', 'View')}
        >
          <button
            type="button"
            aria-pressed={view === 'grid'}
            aria-label={t('blocks.catalog.view_grid', 'Grid view')}
            onClick={() => onViewChange('grid')}
          >
            <DashboardSquare01Icon aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            aria-label={t('blocks.catalog.view_list', 'List view')}
            onClick={() => onViewChange('list')}
          >
            <RightToLeftListBulletIcon aria-hidden="true" />
          </button>
        </div>

        {sortOptionsWithTrans.length > 0 && (
          <label className="s-catalog-toolbar__sort">
            <span className="s-catalog-toolbar__sort-label">
              {t('pages.categories.sorting', 'Sort By')}: <b>{currentSortLabel}</b>
            </span>
            <ChevronDownIcon aria-hidden="true" />
            <select value={selectedSort} onChange={onSortChange}>
              {sortOptionsWithTrans.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

/** The desktop filter column (when visible) + the product grid/list itself. */
function CatalogGrid({
  filtersVisible,
  filters,
  listKey,
  selectedSort,
  view,
  products,
  pagination,
  loader,
  listLayoutClass,
  wideGridClass,
  filterStatus,
  onRetry,
}: {
  filterStatus: 'idle' | 'loading' | 'ready' | 'error';
  onRetry: () => void;
  filtersVisible: boolean;
  filters: ProductListLoaderData['filters'];
  listKey: string;
  selectedSort: string;
  view: View;
  products: Product[];
  pagination: ProductListLoaderData['pagination'];
  loader: ItemsLoaderFn<Product>;
  listLayoutClass: string;
  wideGridClass: string;
}) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className={filtersVisible ? 'md:grid md:grid-cols-[288px_1fr] gap-8' : ''}>
      {filtersVisible && (
        <SallaFilters
          id="filters-menu"
          className="hidden md:block lg:sticky lg:top-20"
          filters={filters as never}
        />
      )}

      <div className="min-w-0">
        <HookSlot name="product:list.items.start" />
        {/* legacy name for the same point */}
        <HookSlot name="product:index.items.start" />

        <div
          className={`flex min-h-screen${filterStatus === 'loading' ? ' opacity-60' : ''}`}
          aria-busy={filterStatus === 'loading'}
        >
          {filterStatus === 'error' ? (
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <NoContent
                icon="sicon-shopping-bag"
                message={t('common.errors.error_occurred', 'Something went wrong')}
              />
              <button
                type="button"
                data-testid="store-catalog-filters-retry"
                className="link--primary mt-4"
                onClick={onRetry}
              >
                {t('common.elements.try_again', 'Try again')}
              </button>
            </div>
          ) : (
            <ItemsList<Product>
              key={`${listKey}-${selectedSort}-${view}`}
              resetKey={`${listKey}-${selectedSort}-${view}`}
              items={products}
              loader={loader}
              mode={pagination?.next ? 'infinite' : 'static'}
              pageUrl={location.pathname + location.searchStr}
              className="s-products-list flex-1 min-w-0"
              itemsClassName={`s-products-list-wrapper ${listLayoutClass}${filtersVisible ? ' s-products-list-with-filters' : ''}${wideGridClass}`}
              skeleton={<ProductCardSkeleton />}
              skeletonType="item"
              skeletonCount={12}
              empty={
                <NoContent
                  icon="sicon-shopping-bag"
                  message={t('pages.categories.no_products', 'No products found in this category')}
                />
              }
              t={(key, fallback) => t(key, fallback || key)}
            >
              {(items) =>
                items.map((prod, idx) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    index={idx}
                    layout={view === 'list' ? 'horizontal' : 'vertical'}
                  />
                ))
              }
            </ItemsList>
          )}
        </div>

        {/* legacy name for the same point */}
        <HookSlot name="product:index.items.end" />
        <HookSlot name="product:list.items.end" />
      </div>
    </div>
  );
}

/** The store-reviews block below the listing — categories only, and only when
 * the merchant has enabled it. */
function CategoryTestimonials({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    // `estimatedHeight="0"`: `RenderWhenVisible` hard-codes `min-height` on
    // its wrapper and never clears it, so an empty `salla-reviews` (no
    // category reviews) reserves 400px. It's collapsed by CSS when empty.
    <RenderWhenVisible estimatedHeight="0px" placeholder={<ReviewItemSkeleton />}>
      <Testimonials data={{}} />
    </RenderWhenVisible>
  );
}

/**
 * Theme fork of the engine `ProductListPage`, registered as `product:list-page`
 * in `app/router.tsx` for every product listing.
 *
 * Same data flow as upstream; the toolbar is rebuilt as a pill with a product
 * count, a grid / list view switch and a styled sort control, plus a desktop
 * "hide filters" toggle that collapses the filter column. View + collapse state
 * persist in `localStorage`. Upgrade notes: `FORKS.md`.
 */

export function ProductListPage({
  page,
  source,
  query,
  products,
  pagination,
  filters,
}: ProductListLoaderData) {
  const { t } = useTranslation();
  const store = useStore();
  const { theme } = useTwilight();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedSort = query.sort;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = usePref<View>('catalog-view', ['grid', 'list'], 'grid');
  const [filtersHidden, setFiltersHidden] = usePref<'0' | '1'>(
    'catalog-filters-hidden',
    ['0', '1'],
    '0'
  );

  const showFilters = !!(query.filters && store?.settings?.product?.filters);
  const filtersVisible = showFilters && filtersHidden === '0';

  // The selection made in `<salla-filters>` — re-queries the list (the route's
  // loader output was fetched without it).
  const {
    filters: appliedFilters,
    page: filteredPage,
    lastPage,
    status: filterStatus,
    retry: retryFilters,
  } = useAppliedFilters(source, selectedSort, showFilters);
  // While a new selection loads, the previous page stays up (dimmed, `aria-busy`); if the
  // request fails nothing stale passes for the new selection. Infinite scroll is only live
  // for the loader's own page or a fully loaded filtered one.
  const shownPage = filterStatus === 'ready' ? filteredPage : lastPage;
  const shownProducts =
    filterStatus === 'error'
      ? []
      : filterStatus === 'idle'
        ? products
        : (shownPage?.items ?? products);
  const shownNext =
    filterStatus === 'idle'
      ? pagination?.next
      : filterStatus === 'ready'
        ? filteredPage?.next
        : null;
  const filteredKey =
    filterStatus === 'idle'
      ? ''
      : `${filterStatus}${filterStatus === 'ready' ? JSON.stringify(appliedFilters) : ''}`;

  const isBrand = source.type === 'brands';
  const isReorder = source.type === 'reorder';
  useReorderButtons(isReorder);

  const sortOptionsWithTrans = useMemo(() => sortOptions(selectedSort, t), [selectedSort, t]);
  const currentSortLabel =
    sortOptionsWithTrans.find((o) => o.id === selectedSort)?.name ?? sortOptionsWithTrans[0]?.name;

  useEffect(() => {
    const handleFiltersChanged = () => setFiltersOpen(false);
    return onSallaEvent('salla-filters::changed', handleFiltersChanged);
  }, []);

  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      // `location.pathname` (not `window.location.pathname`) — the router
      // already strips the store's username/locale base off it and re-adds
      // its own when navigating, so passing the raw browser path here
      // doubles it up (`/store/ar/store/ar/...`) and 404s.
      const params = new URLSearchParams(location.searchStr);
      params.set('sort', event.target.value);
      params.delete('page');
      const search = params.toString();
      navigate(location.pathname + (search ? `?${search}` : ''));
    },
    [navigate, location.pathname, location.searchStr]
  );

  const listKey = source.value ?? source.type;
  // Merchant blocks go on category pages only, as in Twig; offers, search and brands get none.
  const blockScope = useMemo(
    () =>
      source.type === 'categories' && source.value ? { category_id: source.value } : undefined,
    [source.type, source.value]
  );
  const loader = useCatalogLoader(source, selectedSort, shownNext, appliedFilters);

  const listLayoutClass =
    view === 'list' ? 's-products-list-horizontal-cards' : 's-products-list-vertical-cards';
  // Offers (and other filter-less lists) get the full row: 5 columns on desktop.
  const wideGridClass = !query.filters && view === 'grid' ? ' s-products-list-cols-5' : '';

  return (
    <div
      key={listKey}
      className="container px-2.5 mb-10"
      data-source={isReorder ? 'reorder' : undefined}
    >
      {theme?.settings?.product_index_show_breadcrumbs !== false && <Breadcrumb page={page} />}

      <BrandHeader source={source} />

      <HookSlot name="product:list.start" />

      {/* App-block hook `product.index.before_products_group_with_filter` — above the listing */}
      <BlockHookSlot
        name="product.index.before_products_group_with_filter"
        wrapper="s-before-products-list"
        className="!mt-0"
        scope={blockScope}
      />

      <h1 className="font-bold text-xl mb-4" id="page-main-title">
        {isBrand ? t('common.titles.products') : page.title}
      </h1>

      {/* Toolbar — one bar: filter show/hide at the start, options at the end */}
      <CatalogToolbar
        showFilters={showFilters}
        filtersHidden={filtersHidden}
        onToggleFiltersHidden={() => setFiltersHidden(filtersHidden === '1' ? '0' : '1')}
        onOpenMobileFilters={() => setFiltersOpen(true)}
        // `pagination.next` truthy means more pages exist beyond this one —
        // `products.length` (this page only) isn't the true total then, and
        // the API's cursor pagination has no total-count field to fall back
        // to, so show nothing rather than a number that's quietly wrong.
        productsCount={shownNext ? undefined : shownProducts.length}
        view={view}
        onViewChange={setView}
        selectedSort={selectedSort}
        sortOptionsWithTrans={sortOptionsWithTrans}
        currentSortLabel={currentSortLabel}
        onSortChange={handleSortChange}
      />

      <CatalogGrid
        filtersVisible={filtersVisible}
        filters={filters}
        listKey={`${listKey}${filteredKey}`}
        filterStatus={filterStatus}
        onRetry={retryFilters}
        selectedSort={selectedSort}
        view={view}
        products={shownProducts}
        pagination={{ next: shownNext ?? null }}
        loader={loader}
        listLayoutClass={listLayoutClass}
        wideGridClass={wideGridClass}
      />

      {/* App-block hook `product.index.after_products_group_with_filter` — below the listing */}
      <BlockHookSlot
        name="product.index.after_products_group_with_filter"
        wrapper="s-after-products-list"
        scope={blockScope}
      />

      {showFilters && (
        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('pages.categories.filters', 'Filters')}
        >
          <SallaFilters id="filters-menu-mobile" filters={filters as never} />
        </BottomSheet>
      )}

      <CategoryTestimonials
        enabled={source.type === 'categories' && !!store?.settings?.category?.testimonial_enabled}
      />

      {/* App-block hook `product.index.after_testimonials` — after the store-reviews block */}
      <BlockHookSlot
        name="product.index.after_testimonials"
        wrapper="s-after-testimonials"
        scope={blockScope}
      />

      <HookSlot name="product:list.end" />
    </div>
  );
}
