import { describe, it, expect } from 'vitest';
import { youtubeFacades } from '../../app/lib/descriptionVideos';

const embed = (id: string, extra = '') =>
  `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" title="t"${extra}></iframe>`;

describe('youtubeFacades', () => {
  it('swaps a YouTube iframe for a thumbnail button', () => {
    const html = youtubeFacades(`<p>${embed('dQw4w9WgXcQ')}</p>`, new Set(), 'Play video');

    expect(html).not.toContain('<iframe');
    expect(html).toContain('class="video-facade" data-video-index="0" aria-label="Play video"');
    expect(html).toContain('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('numbers each YouTube video and keeps a played one as an autoplaying player', () => {
    const html = youtubeFacades(
      embed('aaaaaaaaaaa') + embed('bbbbbbbbbbb'),
      new Set([1]),
      'Play'
    );

    expect(html).toContain('data-video-index="0"');
    expect(html).not.toContain('data-video-index="1"');
    expect(html).toContain('src="https://www.youtube.com/embed/bbbbbbbbbbb?autoplay=1"');
    expect(html).toContain('allow="autoplay;');
  });

  it("keeps the merchant's own allow list and query string", () => {
    const html = youtubeFacades(
      `<iframe src="https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?rel=0" allow="autoplay"></iframe>`,
      new Set([0]),
      'Play'
    );

    expect(html).toContain('embed/aaaaaaaaaaa?rel=0&amp;autoplay=1');
    expect(html.match(/allow=/g)).toHaveLength(1);
  });

  it.each([
    ['embed/aaaaaaaaaaa#t=30', 'embed/aaaaaaaaaaa?autoplay=1#t=30'],
    ['embed/aaaaaaaaaaa?start=30#t=30', 'embed/aaaaaaaaaaa?start=30&amp;autoplay=1#t=30'],
    ['embed/aaaaaaaaaaa#a?b', 'embed/aaaaaaaaaaa?autoplay=1#a?b'],
  ])('puts autoplay before the fragment of %s', (path, played) => {
    const html = youtubeFacades(
      `<iframe src="https://www.youtube.com/${path}"></iframe>`,
      new Set([0]),
      'Play'
    );

    expect(html).toContain(`src="https://www.youtube.com/${played}"`);
  });

  it('keeps a $ in the address as it is', () => {
    const html = youtubeFacades(
      `<iframe src="https://www.youtube.com/embed/aaaaaaaaaaa?si=a$&amp;b=$'"></iframe>`,
      new Set([0]),
      'Play'
    );

    expect(html).toContain(
      `src="https://www.youtube.com/embed/aaaaaaaaaaa?si=a$&amp;b=$'&amp;autoplay=1"`
    );
  });

  it('leaves other iframes alone', () => {
    const vimeo = '<iframe src="https://player.vimeo.com/video/1"></iframe>';
    expect(youtubeFacades(vimeo, new Set(), 'Play')).toBe(vimeo);
  });

  it('escapes the label', () => {
    expect(youtubeFacades(embed('aaaaaaaaaaa'), new Set(), 'a "b" <c>')).toContain(
      'aria-label="a &quot;b&quot; &lt;c&gt;"'
    );
  });
});
