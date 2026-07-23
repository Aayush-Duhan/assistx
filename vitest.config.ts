import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    exclude: ['**/tests/**', '**/node_modules/**', 'better-chatbot/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'electron/lib/ai/mcp/__tests__/**/*.test.ts',
      'shared/**/*.test.ts',
      'src/apps/onboardingApp/steps/__tests__/**/*.test.ts',
      'src/stores/**/*.test.ts',
    ],
  },
});
