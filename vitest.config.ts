import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
