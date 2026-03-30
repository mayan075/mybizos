import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: __dirname,
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "development",
    },
  },
  resolve: {
    alias: {
      "@hararai/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
