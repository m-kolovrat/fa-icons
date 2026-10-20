/**
 * The three asset sets. Each one is a folder in `svg/` exported from the Fa Design System Figma file.
 *
 * - `suffix`: added to the component name, so sets can't collide (`globe` flag → `GlobeFlag`).
 * - `size`: default `size` prop in px. Sets without it keep the width/height Figma exported.
 * - `frame`: required width × height of every SVG in the set; `npm run check` enforces it.
 * - `currentColor`: replace fills and strokes with `currentColor`, so the page sets the color with a `text-*` class.
 * - `keepColors`: per file name (`*` allowed), colors that stay as exported. `"all"` keeps every color.
 * - `componentNames`: per file name, a component name to use instead of the generated one, for names that would
 *   clash with another export (see `reservedNames`).
 */
export const sets = {
    icons: {
        figma: "Icons V2",
        suffix: "",
        size: 20,
        frame: [20, 20],
        currentColor: true,
        keepColors: {},
        // `Flag` is the <Flag name="…" /> lookup.
        componentNames: { flag: "FlagIcon" },
    },
    flags: {
        figma: "Flag",
        suffix: "Flag",
        frame: [20, 20],
        currentColor: false,
        keepColors: {},
    },
    logos: {
        figma: "Logos",
        suffix: "Logo",
        currentColor: true,
        keepColors: {
            // Fixed brand colors.
            pinpoint: "all",
            "vipps-*": "all",
            "kapital-list-*": "all",
            // Single color, except the orange accent.
            "hegnar-bok": ["#dc6616"],
        },
    },
};

/** Names the package exports besides the generated components. An asset may not generate one of these. */
export const reservedNames = ["Flag", "flags", "FlagName", "FlagProps", "IconProps"];
