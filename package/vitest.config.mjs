import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: ["**/*.mjs"],
      exclude: ["**/examples/**", "**/tests/**", "vitest.config.mjs"],
      thresholds: {
        branches: 85,
        lines: 85,
        functions: 85,
        statements: 85,
      },
    },
  },
});
