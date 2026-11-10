# fa-icons

Icons, flags and logos from the **Fa Design System** Figma file, as React components and as cleaned SVG files.
Set up like [`@untitledui/icons`](https://github.com/untitleduico/icons): SVGs from Figma → SVGO → SVGR → tsup, one file per component.

| Set   | Figma section | Component name           | Color                                                         |
| ----- | ------------- | ------------------------ | ------------------------------------------------------------- |
| Icons | Icons V2      | `arrow-left` → `ArrowLeft` | `currentColor`                                                |
| Flags | Flag          | `norway-nok` → `NorwayNokFlag` | Fixed colors                                                  |
| Logos | Logos         | `fa-large` → `FaLargeLogo` | `currentColor`, except brand-colored logos (see `scripts/config.mjs`) |

## Install

Until the package is published to a registry, install it from a git tag:

```bash
npm install github:m-kolovrat/fa-icons#v0.2.0
```

npm builds `dist/` on install (the `prepare` script). React 18 or newer is a peer dependency.

## React components

```tsx
import { ArrowLeft, Flag, FaLargeLogo, Lock } from "fa-icons";

// Icons are 20px by default (the Figma frame). A Tailwind size class overrides it.
<ArrowLeft className="size-4 text-fg-quaternary" />
<ArrowLeft size={24} />

// Color comes from the text color, because icons use currentColor.
<Button iconLeading={ArrowLeft}>Back</Button>

// Icons are hidden from screen readers by default. Give one an aria-label only when it carries meaning on
// its own; it then renders role="img". An icon-only button gets its name on the button, not the icon.
<Lock aria-label="Pluss-artikkel" />

// Flags by Figma name, typed as FlagName.
<Flag name="norway-nok" className="size-4" />

// Logos keep their Figma width and height.
<FaLargeLogo className="h-6 w-auto text-primary" />
```

Strokes scale with the icon: a 1.5px stroke at 20px is 1.2px at 16px, as in Figma.

Importing from `"fa-icons"` is tree-shaken (`sideEffects: false`). Single files work too:
`import ArrowLeft from "fa-icons/icons/arrow-left"`.

### Screen readers

Not every export is hidden by default:

| Export                                   | Default                              |
| ---------------------------------------- | ------------------------------------ |
| Icons (`<Bell />`, `<Lock />`, …)        | `aria-hidden`                        |
| `<Flag name="…" />`                      | `aria-hidden`                        |
| Named flags (`<NorwayNokFlag />`, …)     | Not hidden, and no accessible name   |
| Logos (`<FaLargeLogo />`, …)             | Not hidden, and no accessible name   |

Any of them with an `aria-label` (or `aria-labelledby`) renders `role="img"` and is announced (since v0.2.0).
An explicit `aria-hidden` you pass always wins.

- Next to text that says the same thing: nothing to do for icons and `<Flag>`. Add `aria-hidden` to a named
  flag or a logo, e.g. `<NorwayNokFlag aria-hidden />`.
- Carries meaning on its own: give it an `aria-label`, e.g. `<NorwayNokFlag aria-label="Norway" />` or
  `<FaLargeLogo aria-label="Fa" />`.

## SVG sprite

`fa-icons/svg/<set>/<name>.svg` are the cleaned SVGs: colors already `currentColor`, ids unique, Figma markup removed.
An app that wants a sprite builds it itself, together with any icons of its own. For example with
[`vite-plugin-svg-icons`](https://github.com/vbenjs/vite-plugin-svg-icons):

```ts
// vite.config.ts
import path from "node:path";
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";

createSvgIconsPlugin({
    iconDirs: [path.resolve("node_modules/fa-icons/dist/svg/icons"), path.resolve("src/icons")],
    symbolId: "icon-[name]",
});
```

```tsx
import "virtual:svg-icons-register";

<svg className="size-5 text-fg-quaternary" aria-hidden="true">
    <use href="#icon-arrow-left" />
</svg>;
```

## Adding or changing assets

Figma is the source. Every asset is a component in its Figma section, and its name becomes the file name.

1. In Figma, select the components in the section and export them as **SVG**. Leave "Outline text" off,
   "Include id attribute" off, and don't outline strokes.
2. Put the files in `svg/icons`, `svg/flags` or `svg/logos`, replacing old ones.
3. Run `npm run check`. It fails on names that aren't lowercase kebab-case, icons and flags whose frame isn't
   20×20, two assets that would get the same component name, and SVG features icons can't use
   (masks, filters, images, text, gradients), because the same files will be converted for Android and iOS.
4. Run `npm run build` and `npm test`.
5. For a new brand-colored logo, add it to `keepColors` in `scripts/config.mjs`. Every other logo color becomes `currentColor`.
6. If a name would clash with another export, `npm run check` says so; give it a `componentNames` override in
   `scripts/config.mjs`. The `flag` icon is `FlagIcon`, because `Flag` is the `<Flag name="…" />` lookup.

## Release

```bash
npm version minor   # 0.1.0 → 0.2.0: new or changed assets. Use major when an asset is renamed or removed.
git push --follow-tags
```

Apps update by changing the tag in their `package.json`.

## Scripts

| Script             | What it does                                                                    |
| ------------------ | ------------------------------------------------------------------------------- |
| `npm run check`    | Validates the SVGs in `svg/`                                                    |
| `npm run generate` | `svg/` → `src/` (components, indexes, cleaned SVGs)                             |
| `npm run build`    | `generate`, then tsup → `dist/`                                                 |
| `npm test`         | Builds `test/fixtures` and checks sizes, colors, ids and the `Flag` lookup      |
| `npm run preview`  | Builds, then serves every component at http://localhost:4310 (size, color, dark) |

`src/` and `dist/` are generated and not committed.
