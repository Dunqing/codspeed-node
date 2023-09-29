import { defineConfig } from "rollup";
import { jsPlugins } from "../../rollup.options";
import pkg from "./package.json" assert { type: "json" };

const entrypoint = "src/index.ts";

export default defineConfig([
  {
    input: entrypoint,
    // for some reasons, vitest only wants to require the `main` entrypoint
    // but fails when its CJS since it cannot require `vitest/*` modules, as
    // they are ESM only 🤷
    // we can circumvent this by exposing the `main` entrypoint as ESM
    output: [{ file: pkg.main, format: "es", sourcemap: true }],
    plugins: jsPlugins(pkg.version),
    external: ["@codspeed/core", /^vitest/],
  },
]);
