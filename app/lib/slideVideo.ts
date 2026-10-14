/** A slide's background video: a YouTube video, or a video file the browser plays itself. */
export type SlideVideo = { kind: 'youtube'; id: string } | { kind: 'file'; src: string };

const YOUTUBE_ID = /^[\w-]{11}$/;

const YOUTUBE_HOSTS = ['youtu.be', 'youtube.com', 'youtube-nocookie.com'];

/** The video id of a YouTube link (watch, youtu.be, shorts, embed or live), if it has one. */
function youtubeId(url: URL): string | null {
  const [, first, second] = url.pathname.split('/');
  const id =
    url.hostname.endsWith('youtu.be')
      ? first
      : first === 'watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts', 'live'].includes(first)
          ? second
          : null;
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/**
 * Reads a slide's `video` setting: a YouTube link plays as an embed, any other
 * http(s) link as a video file (MP4 or WebM). Nothing for an empty or invalid link.
 */
export function parseSlideVideo(value: unknown): SlideVideo | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^(www|m)\./, '');
  if (YOUTUBE_HOSTS.includes(host)) {
    // A YouTube page that isn't a video (a channel, a playlist) can't play here.
    const id = youtubeId(url);
    return id ? { kind: 'youtube', id } : null;
  }
  return { kind: 'file', src: url.href };
}

/**
 * A muted, looping, chrome-less embed, so the video plays as a background. It
 * posts its state to `origin`'s page (`enablejsapi`), so the page can show it
 * only once it plays.
 */
export function youtubeEmbedUrl(id: string, origin?: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id, // a single video only loops when it is also its own playlist
    controls: '0',
    playsinline: '1',
    rel: '0',
    disablekb: '1',
    iv_load_policy: '3',
    enablejsapi: '1',
    ...(origin && { origin }),
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
