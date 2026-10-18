import { memo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { useDate } from '@salla.sa/twilight-theme-engine/hooks';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { blog } from '@salla.sa/twilight-theme-engine/api/blog';
import { ScrollCarousel } from '../common/ScrollCarousel';
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
    position?: number;
    [key: string]: unknown;
  };
}

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
      <Link to={url} className="s-blog-card__image" tabIndex={-1} aria-hidden="true">
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

  // The fetched article, or what the block saved if it can't be fetched.
  const articles = picked
    .map(({ item }, index): BlogArticleData | null => {
      const fetched = results[index]?.data as BlogArticleData | undefined;
      if (fetched) return fetched;
      return item && typeof item === 'object' ? (item as BlogArticleData) : null;
    })
    .filter((article): article is BlogArticleData => Boolean(article?.name));

  const loading = results.some((result) => result.isLoading);
  if (!articles.length && !loading) return null;

  return (
    <>
      <div className="container">
        <h2 className="s-blog__heading">{t('blocks.home.blog', 'Blog')}</h2>
      </div>
      <ScrollCarousel
        prevLabel={t('blocks.home.reviews_prev', 'Previous')}
        nextLabel={t('blocks.home.reviews_next', 'Next')}
      >
        {articles.length
          ? articles.map((article, index) => (
              <ArticleCard key={article.id ?? index} article={article} />
            ))
          : // Keeps the block's height while the articles load (no layout shift).
            picked.map(({ id }) => <div key={id} className="s-blog-card is-loading" />)}
      </ScrollCarousel>
    </>
  );
});
