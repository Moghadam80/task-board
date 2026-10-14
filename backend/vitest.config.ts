import { defineConfig } from 'vitest/config';

// Unit tests (no database, no Nest DI). HTTP-level tests live in
// vitest.config.e2e.ts and need PostgreSQL.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
