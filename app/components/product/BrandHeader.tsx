import { Image } from '@salla.sa/twilight-theme-engine/common';
import type { ProductListLoaderData } from '@salla.sa/twilight-theme-engine/routes/product-listing';

type BrandEntity = { name: string; banner?: string; logo?: string; description?: string };

/** Banner + logo + description above the listing, for a `/brands/{id}` page. Renders
 * nothing for any other source type. */
export function BrandHeader({ source }: { source: ProductListLoaderData['source'] }) {
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
          {/* A <div>, not a <p>: the description is rich text (`<p>…</p>`), and a <p> cannot hold
              a <p>, so the browser split the server's HTML and hydration failed (#418, TD-17818). */}
          {brand.description && (
            <div
              className="text-base text-gray-500 font-medium"
              dangerouslySetInnerHTML={{ __html: brand.description }}
            />
          )}
        </div>
      </header>
    </>
  );
}
