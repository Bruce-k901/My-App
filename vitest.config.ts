import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["**/*.spec.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.test.ts", // Exclude integration tests that require running server
      "tests/critical-paths.test.ts", // Explicitly exclude critical paths test
      "tests/e2e/**", // Playwright e2e tests
      "tests/offline/**", // Playwright offline tests
    ],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/build/**",
        "**/coverage/**",
        "**/*.config.{js,ts}",
        "**/*.d.ts",
        "**/debug-*.js",
        "**/check-*.js",
        "**/create-*.js",
        "**/fix-*.js",
        "**/reset-*.js",
        "**/test-*.js",
        "**/verify-*.js",
        "**/query-*.js",
        "**/execute-*.js",
        "**/drop-*.js",
        "**/apply-*.js",
        "**/scripts/**",
        "**/supabase/functions/**",
        "**/supabase/migrations/**",
        "**/public/**",
        "**/data/**",
        "**/TASK_BUILDER_MODAL_PACKAGE.tsx",
        "**/temp_*.tsx",
        "**/next-env.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
