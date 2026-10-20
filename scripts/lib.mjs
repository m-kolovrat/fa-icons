import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { optimize } from "svgo";
import { sets } from "./config.mjs";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** `arrow-up-right` → `ArrowUpRight`; with the set's suffix, `globe` → `GlobeFlag`. */
export const componentName = (name, suffix = "") =>
    name
        .split("-")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join("") + suffix;

/** The component name for one asset: the config override, or the PascalCase name plus the set's suffix. */
export const componentNameFor = (config, name) => config.componentNames?.[name] ?? componentName(name, config.suffix);

/** Every SVG of every set in `svgDir`, sorted by name. */
export const readSets = (svgDir = join(root, "svg")) =>
    Object.entries(sets).map(([set, config]) => {
        const dir = join(svgDir, set);
        const files = existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".svg")) : [];

        return {
            set,
            config,
            files: files.sort().map((file) => ({
                file: join(set, file),
                name: file.slice(0, -4),
                source: readFileSync(join(dir, file), "utf8"),
            })),
        };
    });

const matches = (pattern, name) => new RegExp(`^${pattern.replace(/[-]/g, "\\-").replace(/\*/g, ".*")}$`).test(name);

/** The colors this file keeps as exported: `"all"`, or a list of lowercase hex values. */
export const keptColors = (config, name) => {
    const entry = Object.entries(config.keepColors).find(([pattern]) => matches(pattern, name));

    return entry ? entry[1] : [];
};

const PAINT_ATTRIBUTES = ["fill", "stroke", "stop-color", "flood-color", "lighting-color"];
const UNPAINTED = new Set(["none", "currentcolor", "inherit", "transparent"]);

/** Turns `#FFF`, `#ffffff`, `white` into `#ffffff` so kept colors match however Figma spelled them. */
const normalizeColor = (value) => {
    const color = value.trim().toLowerCase();
    if (color === "white") return "#ffffff";
    if (color === "black") return "#000000";
    if (/^#[0-9a-f]{3}$/.test(color)) return `#${[...color.slice(1)].map((c) => c + c).join("")}`;
    return color;
};

/** SVGO plugin: replaces every paint except `keep` with `currentColor`. */
const currentColorPlugin = (keep) => ({
    name: "currentColor",
    fn: () => ({
        element: {
            enter: (node) => {
                for (const attribute of PAINT_ATTRIBUTES) {
                    const value = node.attributes[attribute];
                    if (value === undefined || UNPAINTED.has(value.toLowerCase()) || value.startsWith("url(")) continue;
                    if (keep.includes(normalizeColor(value))) continue;
                    node.attributes[attribute] = "currentColor";
                }
            },
        },
    }),
});

/** Cleans one exported SVG: Figma's extra markup out, colors handled per set, ids made unique. */
export const optimizeSvg = (source, { set, config, name }) => {
    const keep = keptColors(config, name);
    const plugins = [
        // Figma sometimes writes paints as inline styles; turn them into attributes before anything else.
        "convertStyleToAttrs",
        ...(config.currentColor && keep !== "all" ? [currentColorPlugin(keep.map(normalizeColor))] : []),
        { name: "preset-default", params: { overrides: { convertColors: { currentColor: false } } } },
        // Ids (clip paths, gradients) must be unique once many SVGs share one page or one sprite.
        { name: "prefixIds", params: { prefix: `${set}-${name}`, delim: "-" } },
        ...(config.size ? ["removeDimensions"] : []),
    ];

    return optimize(source, { path: name, multipass: true, plugins }).data;
};

/** Width and height as Figma exported them, from the attributes or the viewBox. */
export const frameOf = (source) => {
    const tag = source.match(/<svg\b[^>]*>/)?.[0] ?? "";
    const width = tag.match(/\bwidth="([\d.]+)/)?.[1];
    const height = tag.match(/\bheight="([\d.]+)/)?.[1];
    if (width && height) return [Number(width), Number(height)];

    const viewBox = tag.match(/\bviewBox="([^"]+)"/)?.[1]?.split(/[\s,]+/).map(Number);
    return viewBox ? [viewBox[2], viewBox[3]] : undefined;
};
