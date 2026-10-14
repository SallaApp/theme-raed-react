import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { SallaSlider } from '@salla.sa/twilight-components-react/slider';
import { SallaSocialShare } from '@salla.sa/twilight-components-react/social-share';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { Image } from '@salla.sa/twilight-theme-engine/common';
import { isNativeApp } from '@salla.sa/twilight-theme-engine/native-app';
import type { Product, ProductImage } from '@salla.sa/twilight-theme-engine/types';
import { ArrowRightIcon } from '../icons';
import { useHydrated } from '../../hooks/useHydrated';
import { useMobileViewport } from '../../hooks/useMobileViewport';
import { ProductMetadata } from './ProductMetadata';

export interface ProductGalleryProps {
  product: Product;
}

type GalleryMedia = { url: string; type: 'image' | 'video' | '3d-image' };
// The engine's `SallaMobile` type lists `openGallery` only from twilight-platform #439.
type NativeGalleryBridge = {
  openGallery?: (images: ProductImage[], selected?: ProductImage) => boolean;
};

/**
 * The engine's own `mobile::gallery.open` payload from before `salla.mobile.openGallery`: a video's
 * link and a 3D model's file go in `url`, with no ids. Sent when the SDK has no `openGallery`
 * (Twilight before 2.14.569) or declines inside the app, so those stores keep the gallery they had.
 */
function legacyGalleryMedia(images: ProductImage[]): GalleryMedia[] {
  return images.flatMap<GalleryMedia>((image) => {
    if (image.three_d_image_url) return [{ url: image.three_d_image_url, type: '3d-image' }];
    if (image.video_url) return [{ url: image.video_url, type: 'video' }];
    return image.url ? [{ url: image.url, type: 'image' }] : [];
  });
}

/**
 * Theme fork of the engine `ProductGallery`.
 *
 * Differs from upstream in three ways:
 *  - the thumbnails slider runs `slidesPerView: 'auto'` (`thumbsConfig`). The
 *    theme sizes thumbs to a fixed 80px in `slider.scss`; with the engine
 *    default (`slidesPerView: 4`) Swiper lays the track out for quarter-width
 *    slides, so a product with few images left a long, mostly empty track.
 *    `'auto'` makes Swiper measure the real CSS width instead.
 *  - `<SallaMetadata>` (specs table) renders here, below the slider, instead of
 *    in the buy-box column — so the column drops its `md:sticky` when a product
 *    has metadata.
 *  - the Salla app's gallery opens through `salla.mobile.openGallery` on the
 *    tapped item, as the engine does from twilight-platform #439 (not in an
 *    engine release yet).
 *
 * Upgrade notes: `FORKS.md`.
 */
export function ProductGallery({ product }: ProductGalleryProps) {
  const { t } = useTranslation();
  const wishlist = useWishlist();
  const { theme } = useTwilight();
  const sliderId = `details-slider-${product.id}`;
  const objectFit = theme.settings.slider_background_size ?? 'cover';
  const hydrated = useHydrated();
  const isMobile = useMobileViewport();
  // `onAfterInit` fires once Swiper actually finishes laying the slider out —
  // later than `hydrated` (which only means React has mounted; the slider web
  // component upgrades and initializes on its own, separate timeline).
  const [sliderReady, setSliderReady] = useState(false);

  // Twig Raed's fsLightbox; it reads `window` on import, so it loads once the slides are laid out.
  const lightboxReady = useRef(false);
  useEffect(() => {
    if (!sliderReady) return;
    let active = true;
    import('fslightbox')
      .then(() => active && window.refreshFsLightbox?.())
      // Without it the slides stay links to the file, as on Twig before its script runs.
      .catch(() => undefined)
      .finally(() => {
        if (active) lightboxReady.current = true;
      });
    return () => {
      active = false;
    };
  }, [sliderReady, product.id]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(sliderId);
      if (!el?.parentElement) return;
      const { parentElement, nextSibling } = el;
      parentElement.removeChild(el);
      parentElement.insertBefore(el, nextSibling);
    });
    return () => cancelAnimationFrame(raf);
  }, [sliderId]);

  // The product-details API only returns `image` (singular).
  // Fall back so the main image always renders even without the full gallery array.
  const images: ProductImage[] =
    product.images && product.images.length > 0
      ? product.images
      : product.image?.url
        ? [product.image]
        : [];

  const { posterUrl, hidePoster } = useSliderPoster(images[0]);

  const hasManyImages = images.length > 1;
  const openNativeGallery = (selected: ProductImage) => {
    if (!isNativeApp()) return false;
    const mobile = window.salla?.mobile as
      | (NonNullable<typeof window.salla>['mobile'] & NativeGalleryBridge)
      | undefined;
    if (mobile?.openGallery?.(images, selected)) return true;
    window.salla?.event.dispatch('mobile::gallery.open', { images: legacyGalleryMedia(images) });
    return true;
  };

  return (
    // Sticky only when there's nothing under the slider; with `<SallaMetadata>`
    // below it the column is tall, so let it scroll with the page instead.
    // `top-24` clears the sticky header once stuck — `md:` scoped to match
    // `md:sticky`. Unscoped, `relative` (below) made `top` apply on mobile
    // too, visually shifting the whole gallery down 96px while the content
    // after it (ProductDetails' title / tags) still flowed right where the
    // gallery would have sat unshifted — the two rendered on top of each other.
    <div className={galleryClassName(product, images[0])}>
      {/* Mobile: a floating bar over the top of the image — back on one side,
          wishlist + share on the other. Hidden until hydrated, then slides
          down into place instead of popping in wherever the page happens to
          be mid-load. Styling: `04-components/product.scss`. */}
      <div className={`product-gallery__bar md:hidden${hydrated ? ' is-visible' : ''}`}>
        <button
          type="button"
          className="product-gallery__bar-btn"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else window.location.assign('/');
          }}
          aria-label={t('blocks.header.back', 'Back')}
        >
          <ArrowRightIcon aria-hidden="true" />
        </button>
        {/* Waits for the slider itself (`sliderReady`, not just `hydrated`) so
            it doesn't slide in while the images underneath are still loading. */}
        <div className={`product-gallery__bar-actions${sliderReady ? ' is-visible' : ''}`}>
          <button
            type="button"
            className={`product-gallery__bar-btn btn--wishlist ${wishlist.has(Number(product.id)) ? 'is-added' : 'not-added'}`}
            data-id={product.id}
            onClick={() => window.salla?.wishlist?.toggle?.(product.id)}
            aria-label={t('pages.products.add_to_wishlist', 'Add to wishlist')}
          >
            <i className="sicon-heart" aria-hidden="true" />
          </button>
          <SallaSocialShare
            className="product-gallery__bar-btn"
            aria-label={t('blocks.header.share', 'Share')}
          />
        </div>
      </div>

      <SallaSlider
        id={sliderId}
        className="details-slider rounded image-slider"
        type="thumbs"
        pagination
        loop={false}
        autoHeight
        listenToThumbnailsOption
        showThumbsControls={false}
        sliderConfig={{ watchOverflow: true, autoHeight: true }}
        thumbsConfig={{ slidesPerView: 'auto', spaceBetween: 8 }}
        onAfterInit={() => {
          setSliderReady(true);
          hidePoster();
        }}
      >
        {product.promotion_title && (
          <div className="promotion-title">{product.promotion_title}</div>
        )}

        {product.calories && (
          <div className="absolute z-[2] top-4 rtl:left-4 ltr:right-4 bg-white shadow-sm flex flex-col justify-center items-center rounded-full w-20 h-20 md:w-24 md:h-24">
            <span className="text-red-500 text-xl leading-none font-bold">{product.calories}</span>
            <span className="text-xs text-gray-500">
              {t('pages.products.calories', 'Calories')}
            </span>
          </div>
        )}

        <div slot="items">
          {images.map((image, index) => (
            <ImageSlide
              key={image.id ?? image.three_d_image_url ?? image.video_url ?? image.url}
              image={image}
              product={product}
              index={index}
              objectFit={objectFit}
              lightboxReady={lightboxReady}
              onNativeOpen={openNativeGallery}
            />
          ))}
        </div>

        {hasManyImages && (
          // `hidden md:block` on the slot itself (not just the `.s-slider-thumbs`
          // wrapper Stencil renders after hydration, `04-components/slider.scss`)
          // — before hydration this content is still plain unstyled light-DOM
          // children of `salla-slider`, so it was briefly visible on mobile
          // until Stencil moved/wrapped it and the vendor-class rule could apply.
          <div slot="thumbs" className="hidden md:block">
            {images.map((image, index) => (
              <ThumbSlide
                key={image.id ?? image.three_d_image_url ?? image.video_url ?? image.url}
                image={image}
                index={index}
              />
            ))}
          </div>
        )}
      </SallaSlider>

      {posterUrl && (
        <div className="product-gallery__poster" aria-hidden="true">
          <Image
            src={posterUrl}
            alt=""
            className={`h-full w-full object-${objectFit}`}
            aspectRatio="1/1"
            priority
            noWrapper
          />
        </div>
      )}

      {/* Product metadata / specs — on `md`+ it renders here, below the slider.
          On mobile it moves to the end of the description in `ProductDetails`.
          Both copies render until hydration completes (matches the pre-hydration
          CSS-hidden state exactly, so no SSR/first-paint mismatch) — once
          `hydrated`, only the copy the current viewport actually shows stays
          mounted, so a `has_metadata` product doesn't run two full
          `<SallaMetadata>` instances (each its own async spec fetch, its own
          MutationObserver, its own click listener) for the rest of the page's
          life on every load. */}
      {product.has_metadata && (!hydrated || !isMobile) && (
        <ProductMetadata className="mt-8 hidden md:block" />
      )}
    </div>
  );
}

function galleryClassName(product: Product, first: ProductImage | undefined): string {
  return [
    'product-gallery',
    first?.three_d_image_url && 'product-gallery--model',
    'sidebar relative md:top-24 w-full md:!w-2/4 rtl:ml-8 ltr:mr-8 pb-8 md:pb-16 overflow-hidden shrink-0',
    !product.has_metadata && 'md:sticky',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * SSR copy of the first image over the slider until Swiper is up. SallaSlider renders only a
 * skeleton until hydration, so the main image (the LCP) used to be requested late.
 */
function useSliderPoster(first: ProductImage | undefined) {
  const url = first?.three_d_image_url ? undefined : first?.url;
  const [shown, setShown] = useState(Boolean(url));
  const hidePoster = useCallback(() => {
    const image = new window.Image();
    image.src = url ?? '';
    // Wait for the (already cached) image to decode so the swap never flashes.
    Promise.resolve(image.decode?.())
      .catch(() => undefined)
      .then(() => setShown(false));
  }, [url]);
  return { posterUrl: shown ? url : undefined, hidePoster };
}

function ImageSlide({
  image,
  product,
  index,
  objectFit,
  lightboxReady,
  onNativeOpen,
}: {
  image: ProductImage;
  product: Product;
  index: number;
  objectFit: 'cover' | 'contain';
  lightboxReady: RefObject<boolean>;
  onNativeOpen: (image: ProductImage) => boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  if (image.three_d_image_url) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: model-viewer is an interactive web component.
      <model-viewer
        style={{ minHeight: '500px' }}
        className="swiper-slide model-entry w-full h-full"
        loading="lazy"
        camera-controls
        touch-action="pan-y"
        auto-rotate
        poster={image.url || undefined}
        src={image.three_d_image_url}
        shadow-intensity="1"
        alt={image.alt}
        onClick={() => onNativeOpen(image)}
      ></model-viewer>
    );
  }

  return (
    <a
      data-fslightbox={`product_${product.id}`}
      data-img-id={image.id}
      data-slid-index={index}
      {...(image.video_url ? { 'data-video-src': image.video_url } : {})}
      data-caption={image.alt}
      data-infinite="false"
      data-type={image.video_type ?? (image.video_url ? 'youtube' : 'image')}
      href={image.video_url || image.url}
      // Capture runs before fsLightbox's own `onclick`, so the native app's gallery wins.
      onClickCapture={(event) => {
        if (!onNativeOpen(image)) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      // Until fsLightbox has loaded, the bare href would leave the page for the file.
      onClick={(event) => {
        if (!lightboxReady.current) event.preventDefault();
      }}
      aria-label={product.name}
      className={`swiper-slide magnify-wrapper homeslider__slide ${image.video_url ? 'video-entry' : ''}`}
    >
      <div className={`w-full ${loaded ? '' : 'aspect-square bg-gray-100 animate-pulse'}`}>
        <Image
          id={String(image.id)}
          src={image.url}
          alt={image.alt || product.name}
          className={`h-full w-full object-${objectFit}`}
          aspectRatio="1/1"
          priority={index === 0}
          noWrapper
          onLoad={() => setLoaded(true)}
        />
      </div>
    </a>
  );
}

function ThumbSlide({ image, index }: { image: ProductImage; index: number }) {
  return (
    <div
      className={`slide--one-fourth ${image.video_url ? 'video-entry' : ''} ${image.three_d_image_url ? 'model-entry' : ''}`}
      data-caption={image.alt}
    >
      <Image
        src={image.url}
        alt={image.alt || ''}
        className="object-cover w-full h-full bg-gray-100 rounded overflow-hidden"
        title={image.alt}
        priority={index < 5}
        noWrapper
      />
    </div>
  );
}
