import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // One React for the app and the engine, as in vite.config.ts: a test that renders a real
  // engine provider otherwise gets the engine's own copy (null hooks) when it is linked.
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    // Only the engine's Vite plugin serves this; tests get the locale files directly.
    alias: {
      'virtual:twilight/theme-translations': fileURLToPath(
        new URL('./tests/stubs/theme-translations.ts', import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.tsx'],
    include: ['tests/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // The style tests compile the theme's Sass; under a full parallel run they pass alone but exceed the 5s default.
    testTimeout: 20000,
    server: {
      deps: {
        // Vite resolves the extensionless imports in twilight-components-react's dist; Node's ESM rejects them.
        inline: ['@salla.sa/twilight-theme-engine'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['app/**/*.{ts,tsx}'],
      exclude: ['app/**/*.d.ts'],
      // Coverage floor (ratchet): measured on app/** and rounded down. It only goes up —
      // raise it when coverage improves, never lower it to make a change pass.
      // Re-measured once after formatting: app/router.tsx failed to parse under coverage before,
      // so the first floor silently left out its 128 untested lines.
      thresholds: {
        lines: 74,
        branches: 70,
        functions: 64,
        statements: 72,
      },
    },
    reporters: ['default', 'json'],
    outputFile: './coverage/test-results.json',
  },
});
