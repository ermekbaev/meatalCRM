import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    // vitest 4 с дефолтным пулом threads нестабилен на Node 24 + Windows
    // («Cannot read properties of undefined (reading 'config')», «failed to
    // find the runner»). forks-пул решает проблему стабильно.
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
