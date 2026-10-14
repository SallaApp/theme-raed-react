import { describe, it, expect } from 'vitest';
import { parseSlideVideo, youtubeEmbedUrl } from '../../app/lib/slideVideo';

describe('parseSlideVideo', () => {
  it('reads the video id from every kind of YouTube link', () => {
    const id = 'dQw4w9WgXcQ';
    for (const link of [
      `https://www.youtube.com/watch?v=${id}&t=10`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}?si=abc`,
      `https://youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}`,
    ]) {
      expect(parseSlideVideo(link)).toEqual({ kind: 'youtube', id });
    }
  });

  it('plays any other http(s) link as a video file', () => {
    expect(parseSlideVideo(' https://cdn.salla.sa/hero.mp4 ')).toEqual({
      kind: 'file',
      src: 'https://cdn.salla.sa/hero.mp4',
    });
  });

  it('has nothing for an empty, invalid or non-video link', () => {
    expect(parseSlideVideo(undefined)).toBeNull();
    expect(parseSlideVideo('')).toBeNull();
    expect(parseSlideVideo('not a link')).toBeNull();
    expect(parseSlideVideo('javascript:alert(1)')).toBeNull();
    expect(parseSlideVideo('https://www.youtube.com/@salla')).toBeNull();
    expect(parseSlideVideo('https://www.youtube.com/watch?v=short')).toBeNull();
  });
});

describe('youtubeEmbedUrl', () => {
  it('embeds muted, looping and without controls', () => {
    const url = new URL(youtubeEmbedUrl('dQw4w9WgXcQ'));
    expect(url.origin + url.pathname).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('loop')).toBe('1');
    expect(url.searchParams.get('playlist')).toBe('dQw4w9WgXcQ');
    expect(url.searchParams.get('controls')).toBe('0');
  });
});
