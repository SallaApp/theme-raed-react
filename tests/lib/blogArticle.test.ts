import { describe, it, expect } from 'vitest';
import {
  blogArticleAuthor,
  blogArticleExcerpt,
  blogArticleId,
  plainText,
} from '../../app/lib/blogArticle';

describe('blogArticleId', () => {
  it('reads the number at the end of the id, from an id or an object', () => {
    expect(blogArticleId('-/a-1673272609')).toBe('1673272609');
    expect(blogArticleId({ id: '-/a-160640909', name: 'Post' })).toBe('160640909');
    expect(blogArticleId(42)).toBe('42');
    expect(blogArticleId({ id: 7 })).toBe('7');
  });

  it('keeps an id with no number as is', () => {
    expect(blogArticleId(' care-guide ')).toBe('care-guide');
  });

  it('has none for an empty or missing id', () => {
    for (const value of [undefined, null, '', '  ', {}, { id: '' }, Number.NaN]) {
      expect(blogArticleId(value)).toBeUndefined();
    }
  });
});

describe('plainText', () => {
  it('drops tags, decodes entities and collapses spaces', () => {
    expect(plainText('<p class="x">Rose &amp; oud</p>\n<p>&nbsp;notes&#39; &#x2014; top</p>')).toBe(
      "Rose & oud notes' — top"
    );
  });

  it('keeps an entity past the last code point as written', () => {
    expect(plainText('a &#99999999; b')).toBe('a &#99999999; b');
  });
});

describe('blogArticleExcerpt', () => {
  it('prefers the summary, then the plain start of the body', () => {
    expect(blogArticleExcerpt({ promotion_title: 'Short', description: '<p>Long</p>' })).toBe(
      'Short'
    );
    expect(blogArticleExcerpt({ summary: 'From the list' })).toBe('From the list');
    expect(blogArticleExcerpt({ description: '<p>The <b>body</b></p>' })).toBe('The body');
    expect(blogArticleExcerpt({})).toBe('');
  });
});

describe('blogArticleAuthor', () => {
  it('reads a name or an author object', () => {
    expect(blogArticleAuthor({ author: 'Demo Store' })).toBe('Demo Store');
    const author = { name: 'Khalid', url: '/blog/author/1' };
    expect(blogArticleAuthor({ author })).toBe('Khalid');
    expect(blogArticleAuthor({})).toBe('');
  });
});
