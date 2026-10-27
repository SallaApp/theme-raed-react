import type {
  Brand,
  Cart,
  CartItem,
  Category,
  CurrencyConfig,
  MenuItem,
  Product,
  Store,
  User,
} from '@salla.sa/twilight-theme-engine/types';
import type { ArticleDetail, ArticleSummary } from '@salla.sa/twilight-theme-engine/routes/blog';

type Overrides<T> = Partial<T>;

let sequence = 0;
/** Next id for a factory call. `resetFactories()` restarts it so a test's ids are stable. */
export const nextId = () => ++sequence;
export const resetFactories = () => {
  sequence = 0;
};

export const createProduct = (overrides: Overrides<Product> = {}): Product => {
  const id = overrides.id ?? nextId();
  const price = overrides.price ?? 100;
  return {
    id,
    name: `Product ${id}`,
    description: `Description of product ${id}`,
    url: `https://store.test/p${id}`,
    type: 'product',
    status: 'sale',
    price,
    sale_price: null,
    regular_price: typeof price === 'number' ? price : 100,
    base_currency_price: { currency: 'SAR', amount: typeof price === 'number' ? price : 100 },
    currency: 'SAR',
    max_quantity: 10,
    rating: { count: 0, stars: 0 },
    image: { url: `https://cdn.test/products/${id}.webp`, alt: `Product ${id}` },
    images: [{ url: `https://cdn.test/products/${id}.webp`, alt: `Product ${id}`, main: true }],
    is_taxable: true,
    has_read_more: false,
    can_add_note: false,
    can_show_remained_quantity: false,
    can_upload_file: false,
    has_custom_form: false,
    has_metadata: false,
    is_on_sale: false,
    is_available: true,
    is_out_of_stock: false,
    is_require_shipping: true,
    has_size_guide: false,
    ...overrides,
  };
};

export const createSoldOutProduct = (overrides: Overrides<Product> = {}): Product =>
  createProduct({
    status: 'out',
    is_available: false,
    is_out_of_stock: true,
    quantity: 0,
    ...overrides,
  });

export const createOnSaleProduct = (overrides: Overrides<Product> = {}): Product => {
  const regular = overrides.regular_price ?? 200;
  const sale = overrides.sale_price ?? 150;
  return createProduct({
    regular_price: regular,
    sale_price: sale,
    price: sale,
    is_on_sale: true,
    ...overrides,
  });
};

/** A product with one `radio` option of two values (the engine's `ProductOption` shape). */
export const createProductWithOptions = (overrides: Overrides<Product> = {}): Product => {
  const id = overrides.id ?? nextId();
  return createProduct({
    id,
    has_options: true,
    options: [
      {
        id: id * 10,
        name: 'Size',
        type: 'radio',
        required: true,
        values: [
          { id: id * 100 + 1, name: 'S' },
          { id: id * 100 + 2, name: 'M' },
        ],
      },
    ],
    ...overrides,
  });
};

export const createBookingProduct = (overrides: Overrides<Product> = {}): Product =>
  createProduct({ type: 'booking', is_require_shipping: false, ...overrides });

/** `digital_files_settings` is an opaque `JsonObject` in the engine's types, so it is left empty. */
export const createDigitalProduct = (overrides: Overrides<Product> = {}): Product =>
  createProduct({
    type: 'digital',
    is_require_shipping: false,
    digital_files_settings: {},
    ...overrides,
  });

export const createCategory = (overrides: Overrides<Category> = {}): Category => {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Category ${id}`,
    url: `https://store.test/c${id}`,
    products_count: 0,
    sub_categories: [],
    ...overrides,
  };
};

export const createBrand = (overrides: Overrides<Brand> = {}): Brand => {
  const id = overrides.id ?? nextId();
  return {
    id,
    name: `Brand ${id}`,
    logo: `https://cdn.test/brands/${id}.webp`,
    url: `https://store.test/b${id}`,
    ...overrides,
  };
};

export const createMenuItem = (overrides: Overrides<MenuItem> = {}): MenuItem => {
  const id = overrides.id ?? nextId();
  return { id, title: `Menu item ${id}`, url: `https://store.test/m${id}`, ...overrides };
};

export const createCartItem = (overrides: Overrides<CartItem> = {}): CartItem => {
  const product = createProduct({ id: overrides.product_id });
  const quantity = overrides.quantity ?? 1;
  return {
    id: `item-${product.id}`,
    product_id: product.id,
    product_name: product.name,
    product_image: product.image.url ?? '',
    url: product.url,
    quantity,
    type: 'product',
    price: 100,
    product_price: 100,
    total: (typeof overrides.price === 'number' ? overrides.price : 100) * quantity,
    is_available: true,
    is_hidden_quantity: false,
    can_add_note: false,
    can_upload_file: false,
    ...overrides,
  };
};

export const createCart = (overrides: Overrides<Cart> = {}): Cart => {
  const items = overrides.items ?? [];
  const subTotal = items.reduce(
    (sum, item) => sum + (typeof item.total === 'number' ? item.total : 0),
    0
  );
  return {
    id: String(overrides.id ?? '1'),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    sub_total: subTotal,
    total: subTotal,
    discount: 0,
    tax_amount: 0,
    has_shipping: false,
    real_shipping_cost: 0,
    options: [],
    ...overrides,
  };
};

export const createArticle = (overrides: Overrides<ArticleDetail> = {}): ArticleDetail => {
  const id = String(overrides.id ?? nextId());
  return {
    id,
    name: `Article ${id}`,
    description: `Summary of article ${id}`,
    image: `https://cdn.test/blog/${id}.webp`,
    url: `https://store.test/blog/a-${id}`,
    author: { name: 'Store team', url: 'https://store.test/blog/author/1' },
    tags: [],
    ...overrides,
  };
};

export const toArticleSummary = (article: ArticleDetail): ArticleSummary => {
  const summary: Partial<ArticleDetail> = { ...article };
  delete summary.categories;
  delete summary.related;
  return summary as ArticleSummary;
};

export const createUser = (overrides: Overrides<User> = {}): User => ({
  type: 'user',
  id: 1,
  first_name: 'Test',
  last_name: 'Customer',
  email: 'customer@test.dev',
  mobile: '500000000',
  country_code: '+966',
  ...overrides,
});

export const createCurrency = (overrides: Overrides<CurrencyConfig> = {}): CurrencyConfig => ({
  code: 'SAR',
  name: 'Saudi Riyal',
  symbol: 'SAR',
  amount: 1,
  country_code: 'SA',
  ...overrides,
});

/**
 * Only the fields the theme reads are filled; the engine's `Store` has more required ones
 * (see `types/index.d.ts`), so this is cast rather than claimed complete.
 */
export const createStore = (overrides: Overrides<Store> = {}): Store =>
  ({
    id: 1,
    name: 'Test Store',
    username: 'test-store',
    description: 'A store for tests',
    logo: 'https://cdn.test/logo.webp',
    icon: 'https://cdn.test/icon.webp',
    url: 'https://store.test',
    contacts: {},
    settings: {
      auth: { email_allowed: true, mobile_allowed: true, is_email_required: false },
      cart: { apply_coupon_enabled: true },
      product: { total_sold_enabled: 0 },
    },
    ...overrides,
  }) as Store;
