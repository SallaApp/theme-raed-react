/**
 * Helpers for blog articles picked in a home block (`source: blog_articles`).
 * The saved value is an id, or an object with at least an `id`, depending on
 * where it was picked; articles themselves come from `blog/articles/<id>`.
 */

/** An article as the blog API sends it: `author` is a name or `{ name, url }`. */
export interface BlogArticleData {
  id?: string | number;
  name?: string;
  url?: string;
  image?: string;
  promotion_title?: string;
  summary?: string;
  description?: string;
  author?: string | { name?: string; url?: string };
  created_at?: string | number | { date: string; timezone_type: number; timezone: string };
}

/**
 * The id `blog/articles/<id>` answers to: the number at the end of the id
 * (`-/a-1673272609` → `1673272609`), or the id as is when it has none.
 */
export function blogArticleId(item: unknown): string | undefined {
  const raw = item && typeof item === 'object' ? (item as { id?: unknown }).id : item;
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : undefined;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw.match(/(\d+)\s*$/)?.[1] ?? raw.trim();
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** HTML as plain text: tags dropped, common entities decoded, spaces collapsed. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? entity;
      const hex = code[1] === 'x' || code[1] === 'X';
      const point = hex ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      // fromCodePoint throws past the last code point.
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** The short text under an article's title: its summary, or the start of its body. */
export function blogArticleExcerpt(article: BlogArticleData): string {
  const summary = article.promotion_title?.trim() || article.summary?.trim();
  if (summary) return summary;
  return article.description ? plainText(article.description) : '';
}

/** The author's name, whether the API sends a name or an author object. */
export function blogArticleAuthor(article: BlogArticleData): string {
  const { author } = article;
  return (typeof author === 'string' ? author : author?.name)?.trim() ?? '';
}
