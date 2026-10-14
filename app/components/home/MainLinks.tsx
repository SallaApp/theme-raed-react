import { memo } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { SallaSlider } from '@salla.sa/twilight-components-react/slider';

interface LinkItem {
  url?: string;
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

export const MainLinks = memo(function MainLinks({ data }: MainLinksProps) {
  const position = data.position ?? 0;

  const {
    links = [],
    categories = [],
    show_cats: showCats = false,
    show_controls: showControls = false,
    title,
    merge_links_with_top_component: mergeWithTop = false,
  } = data;

  const items = showCats ? categories : links;
  if (!items.length) return null;

  return (
    <>
      <div className="container">
        <SallaSlider
          type="carousel"
          {...(title || mergeWithTop ? { blockTitle: title } : {})}
          controlsOuter
          showControls={showControls}
          id={`main-links-${position}`}
          // Links that fit without scrolling sit in the middle, not against the start edge.
          sliderConfig={{ watchOverflow: true, centerInsufficientSlides: true }}
        >
          <div slot="items">
            {items.map((item, index) => {
              const itemTitle = showCats
                ? (item as Category).name
                : (item as LinkItem).title || (item as LinkItem).link_title;
              const itemIcon = showCats ? (item as Category).icon : (item as LinkItem).icon;
              const itemImage = showCats ? (item as Category).image : (item as LinkItem).image;
              const itemUrl = item.url || '#';

              if (!itemTitle && !showCats) return null;

              return (
                <div
                  // A static settings list with no id; the url is used where one
                  // exists: see .react-doctor/false-positives.md.
                  // react-doctor-disable-next-line react-doctor/no-array-index-as-key
                  key={itemUrl === '#' ? index : itemUrl}
                  className="swiper-slide slide--one-eighth"
                >
                  <Link to={itemUrl} className="slide--cat-entry">
                    {/* The item's image when it has one, filling the circle; its icon
                        otherwise. */}
                    <span className="slide--cat-entry__media">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          width="64"
                          height="64"
                          alt={itemTitle || ''}
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
          </div>
        </SallaSlider>
      </div>
    </>
  );
});
