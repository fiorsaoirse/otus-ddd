import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["homework3/**/*.test.ts", "homework4/**/*.test.ts", "homework5/**/*.test.ts", "homework6/**/*.test.ts"],
  },
});
