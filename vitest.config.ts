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
    include: ['tests/**/*.test.{ts,tsx}'],
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
    },
    reporters: ['default', 'json'],
    outputFile: './coverage/test-results.json',
  },
});
