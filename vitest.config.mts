import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    // Même alias que tsconfig.json, pour que les tests importent `@/logic/...`.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
