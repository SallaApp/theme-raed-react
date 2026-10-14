import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { EnhancedSlider } from '../../../app/components/home/EnhancedSlider';

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({
    to,
    children,
    className,
    tabIndex,
  }: {
    to: string;
    children?: React.ReactNode;
    className?: string;
    tabIndex?: number;
  }) => (
    <a href={to} className={className} tabIndex={tabIndex}>
      {children}
    </a>
  ),
}));

describe('EnhancedSlider', () => {
  const mockSlides = [
    { image: 'slide1.jpg', title: 'Slide 1', description: 'Description 1' },
    { image: 'slide2.jpg', title: 'Slide 2', description: 'Description 2' },
  ];

  it('renders slider element with correct attributes', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
    const slider = container.querySelector('salla-slider');
    expect(slider).toBeTruthy();
    expect(slider?.getAttribute('type')).toBe('fullwidth');
  });

  it('renders SallaSlider with correct attributes', () => {
    const { container } = render(
      <EnhancedSlider data={{ slider_banner: mockSlides, position: 1 }} />
    );
    const slider = container.querySelector('salla-slider');
    expect(slider?.getAttribute('id')).toBe('main-slider-1');
    expect(slider?.getAttribute('auto-play')).toBe('true');
    expect(slider?.getAttribute('type')).toBe('fullwidth');
  });

  it('hides controls and skips autoplay when single slide', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: [mockSlides[0]] }} />);
    const slider = container.querySelector('salla-slider');
    expect(slider?.getAttribute('auto-play')).not.toBe('true');
    expect(slider?.getAttribute('show-controls')).toBe('false');
    expect(slider?.hasAttribute('pagination')).toBe(false);
  });

  it('enables pagination dots alongside the arrows when there are multiple slides', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
    const slider = container.querySelector('salla-slider');
    expect(slider?.hasAttribute('pagination')).toBe(true);
  });

  it('adds the in-container class when in_container is enabled', () => {
    const { container } = render(
      <EnhancedSlider data={{ slider_banner: mockSlides, in_container: true }} />
    );
    const slider = container.querySelector('salla-slider');
    expect(slider?.classList.contains('in-container')).toBe(true);
  });

  it('omits the in-container class by default', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
    const slider = container.querySelector('salla-slider');
    expect(slider?.classList.contains('in-container')).toBe(false);
  });

  it('renders a CTA button when show_button is enabled and it has button text', () => {
    const { container } = render(
      <EnhancedSlider
        data={{
          slider_banner: [
            { ...mockSlides[0], show_button: true, btnname: 'Shop now', link: '/offers' },
          ],
        }}
      />
    );
    const cta = container.querySelector('.home-slider__cta');
    expect(cta?.textContent).toBe('Shop now');
    expect(cta?.getAttribute('href')).toBe('/offers');
  });

  it('omits the CTA button when the slide has no button text', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
    expect(container.querySelector('.home-slider__cta')).toBeNull();
  });

  it('omits the CTA button when show_button is off, even with button text', () => {
    const { container } = render(
      <EnhancedSlider
        data={{
          slider_banner: [
            { ...mockSlides[0], show_button: false, btnname: 'Shop now', link: '/offers' },
          ],
        }}
      />
    );
    expect(container.querySelector('.home-slider__cta')).toBeNull();
  });

  it('renders slides with overlay background', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
    const overlay = container.querySelector('.overlay-bg');
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute('style')).toContain('background-image');
  });

  it('renders slide title with parallax attribute', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
    const title = container.querySelector('h2');
    expect(title?.getAttribute('data-swiper-parallax')).toBe('-500');
    expect(title?.textContent).toBe('Slide 1');
  });

  it('renders slide description with parallax attribute', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
    const desc = container.querySelector('.description');
    expect(desc?.getAttribute('data-swiper-parallax')).toBe('-300');
    expect(desc?.textContent).toBe('Description 1');
  });

  it('returns null when no slides', () => {
    const { container } = render(<EnhancedSlider data={{ slider_banner: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('uses slides property as fallback', () => {
    const { container } = render(<EnhancedSlider data={{ slides: mockSlides }} />);
    expect(container.querySelector('.overlay-bg')).toBeTruthy();
  });

  describe('SSR poster of the first slide', () => {
    it('renders slide 1 as a high-priority <img> when the block has priority', () => {
      const { container } = render(
        <EnhancedSlider data={{ slider_banner: mockSlides, priority: true }} />
      );
      const poster = container.querySelector('.enhanced-slider__poster');
      expect(poster?.getAttribute('aria-hidden')).toBe('true');
      const img = poster?.querySelector('img');
      expect(img?.getAttribute('src')).toBe('slide1.jpg');
      expect(img?.getAttribute('fetchpriority')).toBe('high');
      expect(img?.getAttribute('loading')).toBe('eager');
      expect(poster?.querySelector('h2')?.textContent).toBe('Slide 1');
    });

    it('renders no poster without priority (below-the-fold placement)', () => {
      const { container } = render(<EnhancedSlider data={{ slider_banner: mockSlides }} />);
      expect(container.querySelector('.enhanced-slider__poster')).toBeNull();
    });

    it('renders no poster for the in-container layout', () => {
      const { container } = render(
        <EnhancedSlider data={{ slider_banner: mockSlides, priority: true, in_container: true }} />
      );
      expect(container.querySelector('.enhanced-slider__poster')).toBeNull();
    });

    it('gives the poster a working CTA that stays out of the tab order', () => {
      const { container } = render(
        <EnhancedSlider
          data={{
            slider_banner: [
              { ...mockSlides[0], show_button: true, btnname: 'Shop now', link: '/offers' },
            ],
            priority: true,
          }}
        />
      );
      const cta = container.querySelector('.enhanced-slider__poster a.home-slider__cta');
      expect(cta?.getAttribute('href')).toBe('/offers');
      expect(cta?.getAttribute('tabindex')).toBe('-1');
      const slideCta = container.querySelector('salla-slider a.home-slider__cta');
      expect(slideCta?.getAttribute('href')).toBe('/offers');
      expect(slideCta?.hasAttribute('tabindex')).toBe(false);
    });

    it('removes the poster once the slider reports it has initialised', async () => {
      const { container } = render(
        <EnhancedSlider data={{ slider_banner: mockSlides, priority: true }} />
      );
      expect(container.querySelector('.enhanced-slider__poster')).toBeTruthy();
      await act(async () => {
        // The test mock renders `onAfterInit` as a plain React prop, so the event is
        // `AfterInit`; the real wrapper maps it to the element's `afterInit` event.
        container.querySelector('salla-slider')?.dispatchEvent(new Event('AfterInit'));
      });
      await waitFor(() => expect(container.querySelector('.enhanced-slider__poster')).toBeNull());
    });
  });

  describe('background video', () => {
    const setReducedMotion = (reduce: boolean) =>
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({ matches: reduce } as MediaQueryList)
      );

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('covers the slide with a muted, looping video file over the image', async () => {
      setReducedMotion(false);
      const play = vi
        .spyOn(HTMLMediaElement.prototype, 'play')
        .mockResolvedValue(undefined);
      const { container } = render(
        <EnhancedSlider
          data={{ slider_banner: [{ ...mockSlides[0], video: 'https://cdn.salla.sa/hero.mp4' }] }}
        />
      );
      const video = await waitFor(() => {
        const element = container.querySelector<HTMLVideoElement>('video.enhanced-slider__video');
        expect(element).toBeTruthy();
        return element!;
      });
      expect(video.getAttribute('src')).toBe('https://cdn.salla.sa/hero.mp4');
      expect(video.getAttribute('poster')).toBe('slide1.jpg');
      expect(video.loop).toBe(true);
      expect(video.closest('.overlay-bg')).toBeTruthy();
      // No IntersectionObserver in jsdom, so it plays straight away, muted.
      await waitFor(() => expect(play).toHaveBeenCalled());
      expect(video.muted).toBe(true);
    });

    it('plays a YouTube link as a lazy, muted embed', async () => {
      setReducedMotion(false);
      const { container } = render(
        <EnhancedSlider
          data={{
            slider_banner: [
              { ...mockSlides[0], video: 'https://youtu.be/dQw4w9WgXcQ' },
              mockSlides[1],
            ],
          }}
        />
      );
      const iframe = await waitFor(() => {
        const element = container.querySelector('iframe.enhanced-slider__video--embed');
        expect(element).toBeTruthy();
        return element!;
      });
      expect(iframe.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(iframe.getAttribute('loading')).toBe('lazy');
      expect(container.querySelectorAll('.enhanced-slider__video')).toHaveLength(1);
    });

    it('keeps the image only for visitors who ask for reduced motion', async () => {
      setReducedMotion(true);
      const { container } = render(
        <EnhancedSlider
          data={{ slider_banner: [{ ...mockSlides[0], video: 'https://cdn.salla.sa/hero.mp4' }] }}
        />
      );
      await act(async () => undefined);
      expect(container.querySelector('.enhanced-slider__video')).toBeNull();
      expect(container.querySelector('.overlay-bg')?.getAttribute('style')).toContain('slide1.jpg');
    });
  });
});
