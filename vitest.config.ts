import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.spec.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
});
