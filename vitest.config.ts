import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    exclude: ['**/tests/**', '**/node_modules/**', 'better-chatbot/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'electron/lib/ai/mcp/__tests__/**/*.test.ts',
      'shared/__tests__/**/*.test.ts',
      'src/apps/onboardingApp/steps/__tests__/**/*.test.ts'
    ],
  },
});
