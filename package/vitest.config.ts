import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/dist/**", "**/examples/**", "**/tests/**"],
      thresholds: {
        branches: 85,
        lines: 85,
        functions: 85,
        statements: 85,
      },
    },
  },
});
