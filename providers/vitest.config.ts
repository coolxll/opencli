import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const repoFile = (relativePath: string): string => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@jackwener/opencli/registry': repoFile('src/registry-api.ts'),
      '@jackwener/opencli/errors': repoFile('src/errors.ts'),
      '@jackwener/opencli/types': repoFile('src/types.ts'),
      '@jackwener/opencli/browser/cdp': repoFile('src/browser/cdp.ts'),
    },
  },
  test: {
    include: [
      'feedly/**/*.test.{js,ts}',
      'lingma/**/*.test.{js,ts}',
    ],
  },
});
