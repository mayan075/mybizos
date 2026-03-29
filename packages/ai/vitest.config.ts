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
      "@hararai/shared": path.resolve(__dirname, "../shared/src"),
      "@hararai/ai": path.resolve(__dirname, "./src"),
    },
  },
});
