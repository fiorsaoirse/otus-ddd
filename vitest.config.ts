import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["homework3/**/*.test.ts"],
  },
});
