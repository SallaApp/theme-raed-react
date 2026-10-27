/** An `<iframe>` element, start tag to end tag; quoted values may hold `>`. */
const IFRAME_ELEMENT = /<iframe\b((?:[^>"']|"[^"]*"|'[^']*')*)>[\s\S]*?<\/iframe\s*>/gi;

/** The `src` attribute of a start tag's attributes. */
const SRC_ATTR = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

/** A YouTube embed address, with its 11-character video id. */
const YOUTUBE_EMBED =
  /^(?:https?:)?\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})(?:[?#]|$)/i;

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Swaps each YouTube `<iframe>` in a description for a click-to-play thumbnail
 * (`<button class="video-facade" data-video-index="N">`), so the player's ~1 MB of
 * script loads only for a video the shopper plays. The videos whose index is in
 * `playing` stay real players, set to start at once. Other iframes (Vimeo, maps)
 * are left as they are.
 */
export function youtubeFacades(
  html: string,
  playing: ReadonlySet<number>,
  label: string
): string {
  let index = -1;
  return html.replace(IFRAME_ELEMENT, (element, attrs: string) => {
    const src = attrs.match(SRC_ATTR);
    const url = src?.[1] ?? src?.[2];
    const id = url?.match(YOUTUBE_EMBED)?.[1];
    if (!url || !id) return element;
    index += 1;

    if (playing.has(index)) {
      // Played: the real player, starting at once (the click was the shopper's ask).
      const autoplayUrl = `${url}${url.includes('?') ? '&amp;' : '?'}autoplay=1`;
      const allow = /\sallow\s*=/i.test(attrs.replace(/"[^"]*"|'[^']*'/g, '""'))
        ? ''
        : ' allow="autoplay; encrypted-media; picture-in-picture; fullscreen"';
      return element.replace(url, autoplayUrl).replace(/^<iframe/i, `<iframe${allow}`);
    }

    return (
      `<button type="button" class="video-facade" data-video-index="${index}" aria-label="${escapeAttr(label)}">` +
      `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360">` +
      `</button>`
    );
  });
}
