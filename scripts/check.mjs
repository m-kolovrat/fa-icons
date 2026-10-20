import { fileURLToPath } from "node:url";
import { reservedNames } from "./config.mjs";
import { NAME_PATTERN, componentNameFor, frameOf, readSets } from "./lib.mjs";

/**
 * SVG features Android VectorDrawable can't convert, or that won't follow `currentColor`.
 * Icons must avoid them so the same files work on web, iOS and Android.
 */
const UNSUPPORTED_IN_ICONS = ["<mask", "<filter", "<image", "<text", "<style", "<foreignObject", "Gradient"];

/** Problems with the exported SVGs, as readable lines. Empty when everything is fine. */
export const check = (svgDir) => {
    const problems = [];
    const seen = new Map();

    for (const { set, config, files } of readSets(svgDir)) {
        for (const { file, name, source } of files) {
            if (!NAME_PATTERN.test(name)) {
                problems.push(`${file}: name must be lowercase kebab-case and start with a letter, e.g. "arrow-left"`);
                continue;
            }

            const component = componentNameFor(config, name);
            if (reservedNames.includes(component)) problems.push(`${file}: component name ${component} is reserved; add an override to componentNames in scripts/config.mjs`);
            if (seen.has(component)) problems.push(`${file}: component name ${component} is already used by ${seen.get(component)}`);
            seen.set(component, file);

            if (!/<svg\b/.test(source)) {
                problems.push(`${file}: not an SVG`);
                continue;
            }

            const frame = frameOf(source);
            if (config.frame && (!frame || frame[0] !== config.frame[0] || frame[1] !== config.frame[1])) {
                problems.push(`${file}: frame is ${frame ? frame.join("×") : "unknown"}, expected ${config.frame.join("×")} (export the component frame, not the vector inside it)`);
            }

            if (set === "icons") {
                for (const feature of UNSUPPORTED_IN_ICONS) {
                    if (source.includes(feature)) problems.push(`${file}: uses ${feature.replace("<", "")}, which icons can't use (Android and currentColor)`);
                }
            }
        }
    }

    return problems;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const problems = check(process.argv[2]);

    if (problems.length) {
        console.error(`${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
        process.exit(1);
    }

    const counts = readSets(process.argv[2]).map(({ set, files }) => `${files.length} ${set}`);
    console.log(`All SVGs pass: ${counts.join(", ")}.`);
}
