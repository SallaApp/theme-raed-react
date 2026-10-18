import { memo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { useDate } from '@salla.sa/twilight-theme-engine/hooks';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { blog } from '@salla.sa/twilight-theme-engine/api/blog';
import { ScrollCarousel } from '../common';
import { CalendarIcon, UserIcon } from '../icons';
import {
  blogArticleAuthor,
  blogArticleExcerpt,
  blogArticleId,
  type BlogArticleData,
} from '../../lib/blogArticle';

export interface BlogProps {
  data: {
    /** twilight.json `posts`: the articles the merchant picked, as ids or `{ id, … }`. */
    posts?: unknown[];
    /** Heading over the cards; the translated "Blog" when the block has none saved. */
    title?: string;
    /** Smaller text under the heading; hidden when empty. */
    description?: string;
    /** twilight.json `background_color`: the band's color; light gray when unset. */
    background_color?: string;
    position?: number;
    [key: string]: unknown;
  };
}

// The image repeats the title's link, so it stays out of the tab order and the
// accessibility tree. Both link adapters forward these; BaseLinkProps just
// doesn't declare them.
const IMAGE_LINK_PROPS = { tabIndex: -1, 'aria-hidden': true } as const;

function ArticleCard({ article }: { article: BlogArticleData }) {
  const { format } = useDate();
  const author = blogArticleAuthor(article);
  const excerpt = blogArticleExcerpt(article);
  const { created_at: createdAt } = article;
  // The API sends the date already written out ("31 ديسمبر 2024"); only a real date is formatted.
  const date =
    typeof createdAt === 'string' && Number.isNaN(Date.parse(createdAt))
      ? createdAt
      : createdAt && format(createdAt);
  const url = article.url || '#';

  return (
    <article className="s-blog-card">
      <Link to={url} className="s-blog-card__image" {...IMAGE_LINK_PROPS}>
        {article.image && (
          <Image
            src={article.image}
            alt=""
            className="w-full h-full object-cover"
            width={640}
            height={290}
          />
        )}
      </Link>
      {(date || author) && (
        <div className="s-blog-card__meta">
          {date && (
            <span>
              <CalendarIcon aria-hidden="true" />
              {date}
            </span>
          )}
          {author && (
            <span>
              <UserIcon aria-hidden="true" />
              {author}
            </span>
          )}
        </div>
      )}
      <h3 className="s-blog-card__title">
        <Link to={url}>{article.name}</Link>
      </h3>
      {excerpt && <p className="s-blog-card__excerpt">{excerpt}</p>}
    </article>
  );
}

/**
 * `blog` home block: the articles the merchant picked, as cards in the theme's
 * {@link ScrollCarousel}. The block only saves which articles were picked, so
 * each one's image, summary, author and date come from `blog/articles/<id>`.
 * Styling: `04-components/home-blocks.scss`.
 */
export const Blog = memo(function Blog({ data }: BlogProps) {
  const { t } = useTranslation();
  const picked = (data.posts ?? [])
    .map((item) => ({ item, id: blogArticleId(item) }))
    .filter((entry): entry is { item: unknown; id: string } => Boolean(entry.id));

  const results = useQueries({
    queries: picked.map(({ id }) => ({ ...blog.queries.article(id), retry: false })),
  });

  // One slot per pick, in the picked order: a placeholder while its article
  // loads (so a pick that loads first doesn't jump ahead), then the fetched
  // article, or what the block saved if it can't be fetched.
  const slots = picked
    .map(({ item, id }, index) => {
      const result = results[index];
      if (result?.isLoading) return { id, article: null };
      const saved = item && typeof item === 'object' ? (item as BlogArticleData) : undefined;
      const article = (result?.data as BlogArticleData | undefined) ?? saved;
      return article?.name ? { id, article } : undefined;
    })
    .filter((slot): slot is { id: string; article: BlogArticleData | null } => Boolean(slot));

  if (!slots.length) return null;

  // An empty title hides the heading; a block saved before the field existed has none.
  const title = (data.title ?? t('blocks.home.blog', 'Blog')).trim();
  const description = data.description?.trim();
  const background = data.background_color?.trim();

  return (
    // The band is on the block's own wrapper: the engine's section takes a class, not a style.
    <div className="s-blog" style={background ? { backgroundColor: background } : undefined}>
      {(title || description) && (
        <div className="container s-blog__head">
          {title && <h2 className="s-blog__title">{title}</h2>}
          {description && <p className="s-blog__desc">{description}</p>}
        </div>
      )}
      <ScrollCarousel
        prevLabel={t('blocks.home.reviews_prev', 'Previous')}
        nextLabel={t('blocks.home.reviews_next', 'Next')}
      >
        {slots.map(({ id, article }, index) =>
          article ? (
            <ArticleCard key={`${id}:${index}`} article={article} />
          ) : (
            <div key={`${id}:${index}`} className="s-blog-card is-loading" />
          )
        )}
      </ScrollCarousel>
    </div>
  );
});
