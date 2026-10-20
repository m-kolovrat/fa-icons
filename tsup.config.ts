import { defineConfig } from "tsup";

// One output file per component (dist/icons/arrow-left.mjs …), like @untitledui/icons, so bundlers keep only what's imported.
export default defineConfig({
    entry: ["src/index.ts", "src/icons/*.tsx", "src/flags/*.tsx", "src/logos/*.tsx"],
    format: ["esm", "cjs"],
    outExtension: ({ format }) => ({ js: format === "esm" ? ".mjs" : ".js" }),
    dts: true,
    clean: true,
    minify: true,
    treeshake: true,
    external: ["react"],
    // Cleaned SVGs written by scripts/generate.mjs → dist/svg/<set>/<name>.svg.
    publicDir: "src/public",
});
