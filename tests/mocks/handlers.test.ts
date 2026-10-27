import { describe, it, expect } from 'vitest';
import { product } from '@salla.sa/twilight-theme-engine/api/product';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import { category } from '@salla.sa/twilight-theme-engine/api/category';
import { blog } from '@salla.sa/twilight-theme-engine/api/blog';
import { cart } from '@salla.sa/twilight-theme-engine/api/cart';
import { createProduct } from './factories';
import { defaultScenario } from './scenarios';
import { installMockServer, useScenario } from './server';

installMockServer();

describe('mock store API, driven through the engine api client', () => {
  it('lists products by source, paging and sort', async () => {
    const latest = await product.list({ source: 'latest', perPage: 2 });
    expect(latest.items).toHaveLength(2);
    expect(latest.next).toBe('2');
    const page2 = await product.list({ source: 'latest', perPage: 2, cursor: latest.next! });
    expect(page2.items).toHaveLength(1);
    expect(page2.next).toBeNull();

    const sorted = await product.list({ source: 'latest', sort: 'price' });
    const prices = sorted.items.map((p) => Number(p.sale_price ?? p.price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const offers = (await product.list({ source: 'offers' })).items;
    expect(offers).toHaveLength(1);
    expect(offers.every((p) => p.is_on_sale)).toBe(true);
    expect((await product.list({ source: 'search', keyword: 'nothing-matches' })).items).toEqual(
      []
    );
  });

  it('filters a category source by source_value', async () => {
    const [shirts] = await category.list();
    const result = await product.list({ source: 'categories', sourceValue: [Number(shirts.id)] });
    expect(result.items).toHaveLength(2);
  });

  it('serves a product, a cart and the menus', async () => {
    const [first] = (await product.list({ source: 'latest' })).items;
    expect((await product.find(String(first.id))).id).toBe(first.id);
    expect((await cart.get(1))?.count).toBe(1);
    expect((await menu.header()).map((m) => m.title)).toEqual(['Home', 'Shop']);
    expect(await menu.footer()).toHaveLength(1);
  });

  it('answers 404 for an unknown product', async () => {
    await expect(product.find('999999')).rejects.toThrow();
  });

  it('switches scenarios', async () => {
    useScenario('emptyStore');
    expect((await product.list({ source: 'latest' })).items).toEqual([]);
    useScenario('soldOutProduct');
    expect((await product.list({ source: 'latest' })).items[0].status).toBe('out');
    useScenario('storeWithBlog');
    expect((await blog.get()).articles).toHaveLength(2);
    const [article] = (await blog.articles.list()).data;
    expect((await blog.articles.find(article.id)).name).toBe('First post');
  });

  it('filters a tags source by source_value', async () => {
    const data = defaultScenario();
    const tagged = createProduct({
      tags: [{ id: 5, name: 'Summer', url: 'https://store.test/t5' }],
    });
    useScenario({ ...data, products: [...data.products, tagged] });
    const result = await product.list({ source: 'tags', sourceValue: [5] });
    expect(result.items.map((p) => p.id)).toEqual([tagged.id]);
    expect((await product.list({ source: 'tags', sourceValue: [6] })).items).toEqual([]);
  });
});
