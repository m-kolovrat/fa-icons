import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { check } from "../scripts/check.mjs";
import { generate } from "../scripts/generate.mjs";
import { root } from "../scripts/lib.mjs";

const fixtures = join(root, "test/fixtures/svg");

/** Generates components from `svgDir`, bundles them like tsup would, and imports the result. */
const load = async (svgDir) => {
    // Inside node_modules so the bundle can resolve react.
    mkdirSync(join(root, "node_modules/.cache"), { recursive: true });
    const dir = mkdtempSync(join(root, "node_modules/.cache/fa-icons-test-"));
    await generate(svgDir, join(dir, "src"));
    await build({
        entryPoints: [join(dir, "src/index.ts")],
        outfile: join(dir, "out.mjs"),
        bundle: true,
        format: "esm",
        jsx: "automatic",
        external: ["react", "react/jsx-runtime"],
        logLevel: "silent",
    });

    return { ...(await import(pathToFileURL(join(dir, "out.mjs")).href)), dir };
};

const assets = await load(fixtures);

test("the fixtures pass the check", () => {
    assert.deepEqual(check(fixtures), []);
});

test("icons are 20px by default, follow currentColor and keep their stroke width", () => {
    const html = renderToStaticMarkup(h(assets.ArrowLeft, { className: "size-5 text-fg-quaternary" }));

    assert.match(html, /width="20" height="20"/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /class="size-5 text-fg-quaternary"/);
    assert.match(html, /stroke="currentColor"/);
    assert.match(html, /stroke-width="1.5"/);
    assert.match(html, /viewBox="0 0 20 20"/);
    assert.doesNotMatch(html, /#344054/i);
    assert.equal(assets.ArrowLeft.displayName, "ArrowLeft");
});

test("the published SVGs are the cleaned ones, ready for a sprite", () => {
    const svg = readFileSync(join(assets.dir, "src/public/svg/icons/arrow-left.svg"), "utf8");

    assert.match(svg, /stroke="currentColor"/);
    assert.match(svg, /viewBox="0 0 20 20"/);
    assert.doesNotMatch(svg, /#344054/i);
});

test("icon size and aria-hidden can be overridden", () => {
    const html = renderToStaticMarkup(h(assets.ArrowLeft, { size: 16, "aria-hidden": false, "aria-label": "Back" }));

    assert.match(html, /width="16" height="16"/);
    assert.match(html, /aria-hidden="false"/);
});

test("fill colors written as inline styles also become currentColor", () => {
    const html = renderToStaticMarkup(h(assets.BookmarkFilled));

    assert.match(html, /fill="currentColor"/);
    assert.doesNotMatch(html, /1d2939|style=/i);
});

test("flags keep their colors and get unique ids", () => {
    const html = renderToStaticMarkup(h(assets.Flag, { name: "norway-nok", className: "size-4" }));

    assert.match(html, /#d80027/i);
    assert.match(html, /#0052b4/i);
    assert.match(html, /id="flags-norway-nok-/);
    assert.match(html, /clip-path="url\(#flags-norway-nok-/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /width="20"/);
    assert.deepEqual(Object.keys(assets.flags), ["globe", "norway-nok"]);
});

test("logos switch to currentColor except kept brand colors", () => {
    const hegnar = renderToStaticMarkup(h(assets.HegnarBokLogo));
    assert.match(hegnar, /fill="currentColor"/);
    assert.match(hegnar, /#dc6616/i);
    assert.doesNotMatch(hegnar, /#000|black/i);
    assert.match(hegnar, /width="77"/);

    const vipps = renderToStaticMarkup(h(assets.VippsSmallLogo));
    assert.match(vipps, /#ff5b24/i);
    assert.match(vipps, /#fff/i);
    assert.doesNotMatch(vipps, /currentColor/);
});

test("the check catches bad names, wrong frames and unsupported features", () => {
    const dir = mkdtempSync(join(tmpdir(), "fa-icons-bad-"));
    cpSync(fixtures, dir, { recursive: true });
    writeFileSync(join(dir, "icons/Arrow Right.svg"), '<svg width="20" height="20"></svg>');
    writeFileSync(join(dir, "icons/big.svg"), '<svg width="24" height="24" viewBox="0 0 24 24"></svg>');
    writeFileSync(join(dir, "icons/masked.svg"), '<svg width="20" height="20"><mask id="m"/></svg>');
    writeFileSync(join(dir, "flags/arrow-left.svg"), '<svg width="20" height="20"></svg>');
    writeFileSync(join(dir, "icons/icon-props.svg"), '<svg width="20" height="20"></svg>');

    const problems = check(dir).join("\n");
    assert.match(problems, /Arrow Right\.svg: name must be lowercase kebab-case/);
    assert.match(problems, /big\.svg: frame is 24×24, expected 20×20/);
    assert.match(problems, /masked\.svg: uses mask/);
    assert.doesNotMatch(problems, /flags\/arrow-left/, "ArrowLeftFlag doesn't collide with the ArrowLeft icon");
    assert.match(problems, /icon-props\.svg: component name IconProps is reserved/);
});
