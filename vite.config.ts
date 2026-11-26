import { defineConfig } from 'vite';
import { twilightReact } from '@salla.sa/twilight-theme-engine/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

type ModuleInfo = { isEntry: boolean; importers: string[] } | null;

// Group name callback that names a matching module only when it is statically
// reachable from an entry or from app/hydrate.tsx (which bootClient always loads),
// i.e. code that every page runs anyway.
function everyPage(test: RegExp, name: string) {
  return (id: string, ctx: { getModuleInfo(id: string): ModuleInfo }): string | null => {
    if (!test.test(id)) return null;
    const seen = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const cur = queue.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const info = ctx.getModuleInfo(cur);
      if (!info) continue;
      if (info.isEntry || cur.endsWith('/app/hydrate.tsx')) return name;
      queue.push(...info.importers);
    }
    return null;
  };
}

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
        replacement: path.resolve(import.meta.dirname, './app/lib/empty-css.ts'),
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
        // Rolldown turns `manualChunks` into a single group that also captures every
        // dependency of a matched module, whatever name the function returns for it.
        // Matching the home components therefore dragged i18next, ky, sonner,
        // query-core, swiper, the engine, etc. into one 530 kB `shared-home`.
        // Prioritised groups claim the libraries first, so each chunk keeps its own code.
        codeSplitting: {
          groups: [
            // Kept apart so the entry, which only waits for the LCP image, imports nothing heavy.
            { name: 'preload-helper', test: /vite\/preload-helper/, priority: 100 },
            { name: 'vendor-react', test: /node_modules\/(react|react-dom)\//, priority: 90 },
            {
              name: 'vendor-router',
              test: /node_modules\/@tanstack\/react-router\//,
              priority: 80,
            },
            {
              name: 'vendor-core',
              test: /node_modules\/(i18next|react-i18next|ky|sonner|use-sync-external-store|@tanstack\/(query-core|react-query|virtual-core|react-virtual))\//,
              priority: 70,
            },
            { name: 'vendor-swiper', test: /node_modules\/swiper\//, priority: 60 },
            { name: 'vendor-hooks', test: /node_modules\/@uidotdev\/usehooks\//, priority: 50 },
            // The engine ships prebuilt flat files (dist/Breadcrumb-*.js, dist/chunk-*.js),
            // so match by package and keep only what every page loads; screens the engine
            // imports lazily stay in their own route chunks.
            {
              name: everyPage(
                /node_modules\/(@salla\.sa\/twilight-(theme-engine|components-react)|@lit\/react|@stencil\/react-output-target|react-intersection-observer)\//,
                'vendor-salla'
              ),
              priority: 40,
            },
            {
              name: everyPage(/\/app\/(components\/common\/|components\/icons|hooks\/use|lib\/)/, 'shared-common'),
              priority: 30,
            },
            // The product barrel and ProductPage import ../home, so they are left to shared-home.
            {
              name: everyPage(/\/app\/components\/product\/(?!index|ProductPage)/, 'shared-product'),
              priority: 20,
            },
            { name: 'shared-home', test: /\/app\/components\/home\//, priority: 10 },
          ],
        },
      },
    },
  },
}));
