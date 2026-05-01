import { defineConfig } from "vitest/config";
import path from "path";

/*
 * E2E config: spawns its own `next dev` on port 3001 via globalSetup,
 * runs network-fetch tests against it, then tears it down.
 *
 * Run with: npm run test:e2e
 * Or against a deployed URL: E2E_BASE_URL=https://your-site.vercel.app npm run test:e2e
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.test.ts"],
    globals: true,
    globalSetup: ["tests/e2e/globalSetup.ts"],
    testTimeout: 15_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
