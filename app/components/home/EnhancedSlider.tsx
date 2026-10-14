import { memo, useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { SallaSlider } from '@salla.sa/twilight-components-react/slider';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { parseSlideVideo, youtubeEmbedUrl } from '../../lib/slideVideo';

export interface SliderBanner {
  link?: string;
  image?: string;
  mobile_image?: string;
  video?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  btnname?: string;
  show_button?: boolean;
  direction?: string[];
  title_color?: string;
  subtitle_color?: string;
  btnname_color?: string;
  without_overlay?: boolean;
}

export interface EnhancedSliderProps {
  data: {
    slider_banner?: SliderBanner[];
    slides?: SliderBanner[];
    slider_view_height?: number;
    slider_animation_time?: number;
    slider_aniamtion_time?: number;
    slider_animation_enabled?: boolean;
    /** twilight.json `auto_play`: move to the next slide on a timer. On unless switched off. */
    auto_play?: boolean;
    position?: number;
    in_container?: boolean;
    priority?: boolean;
    [key: string]: unknown;
  };
}

/** Whether motion is allowed (no reduced-motion request); false on the server and before hydration. */
function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    // Follows the setting live: switching it on mid-visit removes the videos.
    const sync = () => setAllowed(!query?.matches);
    sync();
    query?.addEventListener?.('change', sync);
    return () => query?.removeEventListener?.('change', sync);
  }, []);
  return allowed;
}

/**
 * Plays each slide video while it is on screen and pauses it otherwise, so only
 * the visible slide's video downloads and plays. Videos are found in the DOM, not
 * through refs, so the copies Swiper makes of slides for looping play too.
 */
function useSlideVideos(root: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled) return;
    const playIf = (video: HTMLVideoElement, visible: boolean) => {
      if (!visible) return video.pause();
      video.muted = true; // autoplay needs it, and a copied slide only keeps attributes
      video.play().catch(() => undefined);
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) =>
              entries.forEach((entry) =>
                playIf(entry.target as HTMLVideoElement, entry.isIntersecting)
              ),
            // Slides off screen sit beside the visible one, clipped by the slider.
            { threshold: 0.5 }
          );
    const watched = new WeakSet<HTMLVideoElement>();
    const watch = () =>
      element.querySelectorAll<HTMLVideoElement>('video.enhanced-slider__video').forEach((video) => {
        if (watched.has(video)) return;
        watched.add(video);
        if (observer) observer.observe(video);
        else playIf(video, true);
      });
    watch();
    const mutations = new MutationObserver(watch);
    mutations.observe(element, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer?.disconnect();
    };
  }, [root, enabled]);
}

/** How often, and how many times, the page asks a YouTube frame to start sending events. */
const YOUTUBE_LISTEN_INTERVAL_MS = 500;
const YOUTUBE_LISTEN_TRIES = 20;

/** YouTube's player state for "playing". */
const YOUTUBE_PLAYING = 1;

/**
 * A YouTube background, hidden until YouTube reports it is playing, so the slide
 * image shows while it loads, and removed if YouTube reports an error (embedding
 * disabled, video removed). Uses the embed's postMessage events (`enablejsapi`):
 * the page says it is listening, and the frame answers with its state.
 */
function YouTubeBackground({ id }: { id: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<'loading' | 'playing' | 'failed'>('loading');

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let heard = false;
    let tries = 0;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      let data: { event?: string; info?: unknown } | null = null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!data || typeof data !== 'object') return;
      heard = true;
      if (data.event === 'onError') return setState('failed');
      const playerState =
        data.event === 'onStateChange'
          ? data.info
          : (data.info as { playerState?: unknown } | null)?.playerState;
      if (playerState === YOUTUBE_PLAYING) setState('playing');
    };
    let timer: number | undefined;
    const send = () => {
      if (heard || tries >= YOUTUBE_LISTEN_TRIES) return window.clearInterval(timer);
      tries += 1;
      frame.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id, channel: 'widget' }),
        'https://www.youtube-nocookie.com'
      );
    };
    // The frame is lazy, so it may load long after mounting: the tries start then.
    const listen = () => {
      window.clearInterval(timer);
      tries = 0;
      send();
      timer = window.setInterval(send, YOUTUBE_LISTEN_INTERVAL_MS);
    };
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', listen);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('message', onMessage);
      frame.removeEventListener('load', listen);
    };
  }, [id]);

  if (state === 'failed') return null;
  return (
    <iframe
      ref={ref}
      className="enhanced-slider__video enhanced-slider__video--embed"
      data-state={state}
      src={youtubeEmbedUrl(id, window.location.origin)}
      title=""
      loading="lazy"
      allow="autoplay; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

/**
 * A slide's background video, over its image (which stays as the poster and the
 * fallback) and under its overlay. Rendered on the client only, and not for
 * visitors who ask for reduced motion. A video file waits for
 * {@link useSlideVideos} to play it; a YouTube embed loads lazily and plays
 * muted on its own.
 */
function SlideVideo({ url, poster }: { url?: string; poster?: string }) {
  const video = parseSlideVideo(url);
  if (!video) return null;
  if (video.kind === 'youtube') return <YouTubeBackground id={video.id} />;
  return (
    <video
      className="enhanced-slider__video"
      src={video.src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

function SlideText({ slide, poster }: { slide: SliderBanner; poster?: boolean }) {
  return (
    <div className="flex-center container py-16 sm:py-0 home-slider__content relative h-full">
      <div className="w-4/6 text-center md:w-7/12 lg:w-5/12 text-white">
        {slide.title && (
          <h2
            data-swiper-parallax="-500"
            className="lg:text-title-size font-bold leading-tight mb-4 last:mb-0"
          >
            {slide.title}
          </h2>
        )}
        {(slide.subtitle || slide.description) && (
          <p data-swiper-parallax="-300" className="line-clamp-2 description">
            {slide.subtitle || slide.description}
          </p>
        )}
        {slide.show_button && slide.btnname && (
          <Link
            to={slide.link || '#'}
            data-swiper-parallax="-100"
            className="home-slider__cta"
            // The poster is aria-hidden, so its copy stays out of the tab order. Both link
            // adapters forward it; BaseLinkProps just doesn't declare it.
            {...(poster && { tabIndex: -1 })}
          >
            {slide.btnname}
          </Link>
        )}
      </div>
    </div>
  );
}

export const EnhancedSlider = memo(function EnhancedSlider({ data }: EnhancedSliderProps) {
  const slides = data.slider_banner || data.slides || [];
  const position = data.position ?? 1;
  const hasMultipleSlides = slides.length > 1;
  const inContainer = Boolean(data.in_container);
  const firstImage = slides[0]?.image;
  // SSR copy of slide 1 over the slider until Swiper is up. SallaSlider renders only a
  // skeleton until hydration, so the hero image (the LCP) used to be requested late.
  const [showPoster, setShowPoster] = useState(
    Boolean(data.priority && firstImage && !inContainer)
  );
  const hidePoster = useCallback(() => {
    const image = new Image();
    image.src = firstImage ?? '';
    // Wait for the (already cached) image to decode so the swap never flashes.
    Promise.resolve(image.decode?.())
      .catch(() => undefined)
      .then(() => setShowPoster(false));
  }, [firstImage]);

  const root = useRef<HTMLDivElement>(null);
  const motionAllowed = useMotionAllowed();
  const hasVideo = motionAllowed && slides.some((slide) => parseSlideVideo(slide.video));
  useSlideVideos(root, hasVideo);

  if (!slides.length) return null;

  const first = slides[0];

  return (
    <div className="enhanced-slider" ref={root}>
      <SallaSlider
        id={`main-slider-${position}`}
        // Swiper's autoplay redraws every frame for its countdown, so a single slide skips it.
        autoPlay={hasMultipleSlides && data.auto_play !== false}
        sliderConfig={{ lazy: false, watchOverflow: true }}
        showControls={hasMultipleSlides}
        pagination={hasMultipleSlides}
        type="fullwidth"
        className={inContainer ? 'in-container' : undefined}
        onAfterInit={showPoster ? hidePoster : undefined}
      >
        <div slot="items">
          {slides.map((slide, index) => (
            // The slide's ratio lives in CSS (home-blocks.scss): taller on phones.
            <div key={index} className="swiper-slide w-full bg-dark relative">
              <div
                style={{ backgroundImage: `url(${slide.image})` }}
                className={`${slide.without_overlay ? '' : 'overlay-bg'} bg-cover bg-center absolute inset-0`}
              >
                {motionAllowed && <SlideVideo url={slide.video} poster={slide.image} />}
              </div>
              <SlideText slide={slide} />
            </div>
          ))}
        </div>
      </SallaSlider>

      {showPoster && (
        <div className="enhanced-slider__poster" aria-hidden="true">
          <div className="swiper-slide w-full bg-dark relative">
            <div
              className={`${first.without_overlay ? '' : 'overlay-bg'} absolute inset-0 overflow-hidden`}
            >
              <img
                src={first.image}
                alt=""
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <SlideText slide={first} poster />
          </div>
        </div>
      )}
    </div>
  );
});
