import { memo } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { getCdnImageUrl } from '@salla.sa/twilight-theme-engine/utils/cdn-image';
import { ScrollCarousel } from '../common';
import { blockLinkUrl } from '../../lib/blockLink';

interface LinkItem {
  url?: string;
  /** The link kind the merchant picked; a fixed page (`offers_link`) comes with no `url`. */
  url__type?: string;
  icon?: string;
  image?: string;
  title?: string;
  link_title?: string;
  link_subtitle?: string;
}

interface Category {
  url?: string;
  icon?: string;
  image?: string;
  name?: string;
}

export interface MainLinksProps {
  data: {
    links?: LinkItem[];
    categories?: Category[];
    show_cats?: boolean;
    show_controls?: boolean;
    auto_play?: boolean;
    is_slider?: boolean;
    rounded_links?: boolean;
    centered_force?: boolean;
    custom_classes?: string;
    vertical_links?: boolean;
    grayscale_links?: boolean;
    simplified_links?: boolean;
    merge_links_with_top_component?: boolean;
    title?: string;
    description?: string;
    position?: number;
    [key: string]: unknown;
  };
}

/**
 * The main links (and square links) home block: a row of round shortcuts.
 *
 * A {@link ScrollCarousel}, not `<salla-slider>`: the React wrapper of the web
 * component defers it to the browser, so the server sent only a skeleton and the
 * links (and their hrefs) appeared once the page had hydrated and the block was in
 * view, 10 to 20 seconds on a slow load (TD-18336). This row is in the server HTML.
 */
export const MainLinks = memo(function MainLinks({ data }: MainLinksProps) {
  const { t } = useTranslation();
  const position = data.position ?? 0;

  const {
    links = [],
    categories = [],
    show_cats: showCats = false,
    show_controls: showControls = false,
    title,
  } = data;

  const items = showCats ? categories : links;
  if (!items.length) return null;

  return (
    <div className="container" id={`main-links-${position}`}>
      <ScrollCarousel
        // `.s-slider-block__title`: the merged-with-the-block-above styles (home-blocks.scss).
        heading={
          title ? <h2 className="s-slider-block__title s-main-links__title">{title}</h2> : undefined
        }
        prevLabel={t('blocks.home.reviews_prev', 'Previous')}
        nextLabel={t('blocks.home.reviews_next', 'Next')}
        controls={showControls}
        className="s-main-links__track"
      >
        {items.map((item, index) => {
          const itemTitle = showCats
            ? (item as Category).name
            : (item as LinkItem).title || (item as LinkItem).link_title;
          const itemIcon = showCats ? (item as Category).icon : (item as LinkItem).icon;
          const itemImage = showCats ? (item as Category).image : (item as LinkItem).image;
          const itemUrl = blockLinkUrl(item) ?? '#';

          if (!itemTitle && !showCats) return null;

          return (
            <div
              // A static settings list with no id, and several items can share a
              // url (`/offers`): see .react-doctor/false-positives.md.
              // react-doctor-disable-next-line react-doctor/no-array-index-as-key
              key={index}
              className="slide--one-eighth"
            >
              <Link to={itemUrl} className="slide--cat-entry">
                {/* The item's image when it has one, filling the circle; its icon
                    otherwise. */}
                <span className="slide--cat-entry__media">
                  {itemImage ? (
                    <img
                      // The CDN's 128px copy (sharp at 64px on 2x screens), not the original upload.
                      src={getCdnImageUrl(itemImage, { width: 128 }) ?? itemImage}
                      width="64"
                      height="64"
                      // The title right after it names the link; an alt would say it twice.
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : itemIcon ? (
                    <i className={itemIcon} />
                  ) : null}
                </span>
                <h2>{itemTitle}</h2>
              </Link>
            </div>
          );
        })}
      </ScrollCarousel>
    </div>
  );
});
