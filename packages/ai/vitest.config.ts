import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@mybizos/shared": path.resolve(__dirname, "../shared/src"),
      "@mybizos/ai": path.resolve(__dirname, "./src"),
    },
  },
});
