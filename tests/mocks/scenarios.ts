import type {
  Brand,
  Cart,
  Category,
  CurrencyConfig,
  MenuItem,
  Product,
  Store,
  User,
} from '@salla.sa/twilight-theme-engine/types';
import type { ArticleDetail } from '@salla.sa/twilight-theme-engine/routes/blog';
import {
  createArticle,
  createBrand,
  createCart,
  createCartItem,
  createCategory,
  createCurrency,
  createMenuItem,
  createOnSaleProduct,
  createProduct,
  createSoldOutProduct,
  createStore,
  createUser,
  resetFactories,
} from './factories';

/** Everything the handlers serve. A scenario is one of these; tests override single keys. */
export interface MockData {
  store: Store;
  currencies: Record<string, CurrencyConfig>;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  headerMenu: MenuItem[];
  footerMenu: MenuItem[];
  articles: ArticleDetail[];
  cart: Cart;
  user: User;
}

export const defaultScenario = (): MockData => {
  resetFactories();
  const categories = [createCategory({ name: 'Shirts' }), createCategory({ name: 'Shoes' })];
  const products = [
    createProduct({
      category: { id: Number(categories[0].id), name: 'Shirts', url: categories[0].url },
    }),
    createProduct({
      category: { id: Number(categories[0].id), name: 'Shirts', url: categories[0].url },
      price: 80,
    }),
    createOnSaleProduct({
      category: { id: Number(categories[1].id), name: 'Shoes', url: categories[1].url },
    }),
  ];
  return {
    store: createStore(),
    currencies: { SAR: createCurrency() },
    products,
    categories,
    brands: [createBrand(), createBrand()],
    headerMenu: [createMenuItem({ title: 'Home' }), createMenuItem({ title: 'Shop' })],
    footerMenu: [createMenuItem({ title: 'Privacy' })],
    articles: [],
    cart: createCart({ items: [createCartItem({ product_id: products[0].id })] }),
    user: createUser(),
  };
};

export const emptyStoreScenario = (): MockData => ({
  ...defaultScenario(),
  products: [],
  categories: [],
  brands: [],
  headerMenu: [],
  footerMenu: [],
  cart: createCart(),
});

export const soldOutProductScenario = (): MockData => {
  const data = defaultScenario();
  return {
    ...data,
    products: [createSoldOutProduct({ name: 'Sold out product' }), ...data.products],
  };
};

export const storeWithBlogScenario = (): MockData => ({
  ...defaultScenario(),
  articles: [createArticle({ name: 'First post' }), createArticle({ name: 'Second post' })],
});

export const multiCurrencyScenario = (): MockData => ({
  ...defaultScenario(),
  currencies: {
    SAR: createCurrency(),
    USD: createCurrency({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      amount: 0.27,
      country_code: 'US',
    }),
  },
});

export const scenarios = {
  default: defaultScenario,
  emptyStore: emptyStoreScenario,
  soldOutProduct: soldOutProductScenario,
  storeWithBlog: storeWithBlogScenario,
  multiCurrency: multiCurrencyScenario,
};
export type ScenarioName = keyof typeof scenarios;
