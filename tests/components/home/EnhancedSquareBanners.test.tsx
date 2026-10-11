import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EnhancedSquareBanners } from '../../../app/components/home/EnhancedSquareBanners';

// Mock the sub-path exports
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({
    to,
    children,
    className,
    'aria-label': ariaLabel,
    style,
  }: {
    to: string;
    children?: React.ReactNode;
    className?: string;
    'aria-label'?: string;
    style?: React.CSSProperties;
  }) => (
    <a href={to} className={className} aria-label={ariaLabel} style={style}>
      {children}
    </a>
  ),
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

describe('EnhancedSquareBanners', () => {
  const mockBanners = [
    { image: 'banner1.jpg', url: '/url1', title: 'Banner 1', description: 'Desc 1' },
    { image: 'banner2.jpg', url: '/url2', title: 'Banner 2', description: 'Desc 2' },
    { image: 'banner3.jpg', url: '/url3' },
  ];

  it('renders banner items', () => {
    const { container } = render(<EnhancedSquareBanners data={{ banners: mockBanners }} />);
    const banners = container.querySelectorAll('.banner-entry');
    expect(banners.length).toBe(3);
  });

  it('adds has-overlay class when title exists', () => {
    const { container } = render(<EnhancedSquareBanners data={{ banners: mockBanners }} />);
    const banner = container.querySelector('.banner-entry');
    expect(banner?.className).toContain('has-overlay');
  });

  it('renders banner title', () => {
    const { container } = render(<EnhancedSquareBanners data={{ banners: mockBanners }} />);
    const title = container.querySelector('.banner__title');
    expect(title?.textContent).toBe('Banner 1');
  });

  it('uses h-lg-banner class for 3 or fewer banners', () => {
    const { container } = render(<EnhancedSquareBanners data={{ banners: mockBanners }} />);
    const banner = container.querySelector('.banner-entry');
    expect(banner?.className).toContain('h-lg-banner');
  });

  it('uses h-banner class for 4 banners', () => {
    const fourBanners = [...mockBanners, { image: 'banner4.jpg', url: '/url4' }];
    const { container } = render(<EnhancedSquareBanners data={{ banners: fourBanners }} />);
    const banner = container.querySelector('.banner-entry');
    expect(banner?.className).toContain('h-banner');
  });

  it('renders background image on link', () => {
    const { container } = render(<EnhancedSquareBanners data={{ banners: mockBanners }} />);
    const link = container.querySelector('.banner-entry');
    expect(link?.style.backgroundImage).toContain('banner1.jpg');
    expect(link?.className).toContain('bg-cover');
    expect(link?.className).toContain('bg-center');
  });

  it('returns null when no banners', () => {
    const { container } = render(<EnhancedSquareBanners data={{ banners: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  describe('with 5 banners', () => {
    const fiveBanners = [
      { image: 'tl.jpg', url: '/tl', title: 'TL', description: 'Top left' },
      { image: 'center.jpg', url: '/center', title: 'Center', description: 'Center banner' },
      { image: 'tr.jpg', url: '/tr', title: 'TR', description: 'Top right' },
      { image: 'bl.jpg', url: '/bl', title: 'BL', description: 'Bottom left' },
      { image: 'br.jpg', url: '/br', title: 'BR', description: 'Bottom right' },
    ];

    it('renders the hero mosaic instead of the plain grid', () => {
      const { container } = render(<EnhancedSquareBanners data={{ banners: fiveBanners }} />);
      expect(container.querySelector('.enhanced-square-banners-mosaic')).toBeTruthy();
      expect(container.querySelectorAll('.enhanced-square-banner').length).toBe(5);
      expect(container.querySelector('.banner-entry')).toBeNull();
    });

    it('renders title, description and a discover-now CTA per banner', () => {
      const { container } = render(<EnhancedSquareBanners data={{ banners: fiveBanners }} />);
      const first = container.querySelector('.enhanced-square-banner');
      expect(first?.querySelector('.enhanced-square-banner__title')?.textContent).toBe('TL');
      expect(first?.querySelector('.enhanced-square-banner__description')?.textContent).toBe(
        'Top left'
      );
      expect(first?.querySelector('.enhanced-square-banner__cta')?.textContent).toBe(
        'Discover now'
      );
    });

    it('omits the CTA when a banner has no url', () => {
      const noUrl = [...fiveBanners.slice(0, 4), { ...fiveBanners[4], url: undefined }];
      const { container } = render(<EnhancedSquareBanners data={{ banners: noUrl }} />);
      const last = container.querySelectorAll('.enhanced-square-banner')[4];
      expect(last.querySelector('.enhanced-square-banner__cta')).toBeNull();
    });
  });
});
