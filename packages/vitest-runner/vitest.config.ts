import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    runner: ".",
    // ! properties below are mandatory to ensure profiling works
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
