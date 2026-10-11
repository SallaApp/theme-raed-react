import { defineConfig } from 'vite';
import { twilightReact } from '@salla.sa/twilight-theme-engine/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig(async () => ({
  plugins: [
    // twilightReact() registers and configures the SSR runtime, so a theme
    // configures no server runtime of its own.
    ...(await twilightReact({
      localesDir: './locales',
    })),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  resolve: {
    alias: [
      // Swiper's stylesheets otherwise land in a per-chunk CSS file that the
      // framework links render-blocking on every page. The same rules ship in
      // app/styles/vendor/swiper.css via app.css and critical.scss instead.
      {
        find: /^swiper\/css(\/navigation|\/autoplay)?$/,
        replacement: path.resolve(__dirname, './app/lib/empty-css.ts'),
      },
    ],
    // Singleton libs whose React context must be shared between the app and the
    // engine's bundled screens/components (they call useSuspenseQuery /
    // useTranslation but don't own these). Without dedupe the strict published
    // layout resolves a second copy → "No QueryClient set" / missing i18n context.
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@tanstack/react-router',
      '@tanstack/react-query',
      'react-i18next',
      'i18next',
    ],
  },
  environments: {
    ssr: {
      // The workerd SSR runner can't execute raw CommonJS ("module is not
      // defined") and SSR environments don't pre-bundle deps by default. Pre-
      // optimize the CJS deps that reach SSR: @tanstack/react-query (so the
      // engine's QueryClientProvider and route loaders share one
      // QueryClientContext) and the engine's i18n chain
      // (react-i18next → html-parse-stringify → void-elements, use-sync-
      // external-store). Nested paths resolve under pnpm's strict layout.
      optimizeDeps: {
        include: [
          '@tanstack/react-query',
          '@salla.sa/twilight-theme-engine > react-i18next',
          '@salla.sa/twilight-theme-engine > i18next',
          '@salla.sa/twilight-theme-engine > react-i18next > html-parse-stringify',
          '@salla.sa/twilight-theme-engine > react-i18next > html-parse-stringify > void-elements',
          '@salla.sa/twilight-theme-engine > react-i18next > use-sync-external-store',
        ],
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler', silenceDeprecations: ['import'] } as any,
    },
  },
  build: {
    modulePreload: {
      resolveDependencies: (url: string, deps: string[]): string[] => {
        return deps.filter(
          (d: string) =>
            d.includes('vendor') ||
            d.includes('router') ||
            d.includes('main') ||
            d.includes('index') ||
            d.includes('shared-')
        );
      },
    },
    rollupOptions: {
      external: ['@salla.sa/twilight-components', '@salla.sa/twilight-components/dist/*'],
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks(id: string): string | undefined {
          // Kept apart so the entry, which only waits for the LCP image, imports nothing heavy.
          if (id.includes('vite/preload-helper')) {
            return 'preload-helper';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@tanstack/react-router/')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@uidotdev/usehooks/')) {
            return 'vendor-hooks';
          }
          if (
            id.includes('/components/common/Breadcrumb') ||
            id.includes('/components/common/NoContent') ||
            id.includes('/components/common/Image') ||
            id.includes('/components/common/Link') ||
            id.includes('/components/common/CurrencySymbol')
          ) {
            return 'shared-common';
          }
          if (
            id.includes('/components/product/ProductCard') ||
            id.includes('/components/product/ProductDetails') ||
            id.includes('/components/product/ProductGallery') ||
            id.includes('/components/product/AddToCartForm')
          ) {
            return 'shared-product';
          }
          if (
            id.includes('/components/home/ProductsSlider') ||
            id.includes('/components/home/Testimonials') ||
            id.includes('/components/home/HomeComponentRenderer')
          ) {
            return 'shared-home';
          }
        },
      },
    },
  },
}));
