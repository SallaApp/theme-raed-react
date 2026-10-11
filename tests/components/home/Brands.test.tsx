import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Brands } from '../../../app/components/home/Brands';

// Mock the sub-path exports
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({
    locale: 'ar',
    direction: 'rtl',
    isRTL: true,
    isLTR: false,
    languageName: 'العربية',
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

const themeSettings: { is_more_button_enabled?: boolean } = {};
let theme: { settings?: typeof themeSettings } | undefined = { settings: themeSettings };
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children?: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe('Brands', () => {
  const mockBrands = [
    { id: 1, name: 'Brand 1', logo: 'logo1.png', url: '/brand/1' },
    { id: 2, name: 'Brand 2', logo: 'logo2.png', url: '/brand/2' },
    { id: 3, name: 'Brand 3', logo: 'logo3.png', url: '/brand/3' },
  ];

  it('renders title when provided', () => {
    const { container } = render(<Brands data={{ brands: mockBrands, title: 'Our Brands' }} />);
    expect(container.querySelector('h2')?.textContent).toBe('Our Brands');
  });

  it('renders "View All" to the brands page when the theme turns the more button on', () => {
    themeSettings.is_more_button_enabled = true;
    const { container } = render(<Brands data={{ brands: mockBrands, title: 'Our Brands' }} />);
    const link = container.querySelector('.s-block__display-all');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/brands');
  });

  it('leaves "View All" out when the theme turns the more button off', () => {
    themeSettings.is_more_button_enabled = false;
    const { container } = render(<Brands data={{ brands: mockBrands, title: 'Our Brands' }} />);
    expect(container.querySelector('.s-block__display-all')).toBeNull();
  });

  it('still lists the brands when the settings carry no theme', () => {
    theme = undefined;
    try {
      const { container } = render(<Brands data={{ brands: mockBrands, title: 'Our Brands' }} />);
      expect(container.querySelectorAll('.brand-item').length).toBe(3);
      expect(container.querySelector('.s-block__display-all')).toBeNull();
    } finally {
      theme = { settings: themeSettings };
    }
  });

  it('renders brand items', () => {
    const { container } = render(<Brands data={{ brands: mockBrands }} />);
    const brandItems = container.querySelectorAll('.brand-item');
    expect(brandItems.length).toBe(3);
  });

  it('returns null when no brands', () => {
    const { container } = render(<Brands data={{ brands: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders brand images with correct dimensions', () => {
    const { container } = render(<Brands data={{ brands: mockBrands }} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('width')).toBe('400');
    expect(img?.getAttribute('height')).toBe('300');
  });
});
