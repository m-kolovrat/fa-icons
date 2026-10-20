import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { componentNameFor, readSets, root } from "./lib.mjs";

/**
 * Writes preview/index.html: every built component rendered by React from dist/, so the page shows exactly what
 * apps get. Run `npm run build` first; `npm run preview` does both and serves the page.
 */
const assets = await import(pathToFileURL(join(root, "dist/index.mjs")).href);
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const sections = readSets()
    .filter(({ files }) => files.length)
    .map(({ set, config, files }) => {
        const tiles = files
            .map(({ name }) => {
                const component = componentNameFor(config, name);
                const svg = renderToStaticMarkup(set === "flags" ? h(assets.Flag, { name }) : h(assets[component]));
                const search = `${name} ${component}`.toLowerCase();

                const usage = (set === "flags" ? `<Flag name="${name}" />` : `<${component} />`).replace(/</g, "&lt;").replace(/"/g, "&quot;");

                return `<button class="tile" data-search="${search}" data-copy="${usage}" title="Copy ${usage}">
    <span class="art">${svg}</span>
    <span class="name">${escape(name)}</span>
    <span class="component">${escape(set === "flags" ? `Flag name="${name}"` : component)}</span>
</button>`;
            })
            .join("\n");

        return `<section data-set="${set}">
    <h2>${set[0].toUpperCase() + set.slice(1)} <span class="count">${files.length}</span></h2>
    <p class="hint">${
        {
            icons: "currentColor; strokes scale with the size.",
            flags: "Fixed colors.",
            logos: "currentColor, except brand-colored logos. Shown at their Figma size.",
        }[set]
    }</p>
    <div class="grid ${set}">${tiles}</div>
</section>`;
    })
    .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>fa-icons preview</title>
<style>
    :root { --bg: #ffffff; --surface: #f5f5f6; --border: #e9eaeb; --text: #181d27; --muted: #717680; --icon: #252b37; --accent: #444ce7; }
    :root.dark { --bg: #0c0e12; --surface: #13161b; --border: #22262f; --text: #f7f7f7; --muted: #94979c; --icon: #cecfd2; --accent: #8098f9; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 14px/1.4 Inter, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); }
    header { position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; padding: 16px 24px; background: var(--bg); border-bottom: 1px solid var(--border); }
    header h1 { margin: 0 auto 0 0; font-size: 18px; }
    header label { display: flex; gap: 8px; align-items: center; color: var(--muted); }
    input[type="search"] { width: 200px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font: inherit; }
    .sizes button, .themes button { padding: 4px 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font: inherit; cursor: pointer; }
    .sizes button:first-child, .themes button:first-child { border-radius: 8px 0 0 8px; }
    .sizes button:last-child, .themes button:last-child { border-radius: 0 8px 8px 0; }
    .sizes button[aria-pressed="true"], .themes button[aria-pressed="true"] { background: var(--surface); font-weight: 600; }
    main { padding: 8px 24px 48px; }
    h2 { margin: 32px 0 4px; font-size: 16px; }
    .count { color: var(--muted); font-weight: 400; }
    .hint { margin: 0 0 16px; color: var(--muted); }
    .grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); }
    .grid.logos { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); color: var(--icon); font: inherit; cursor: pointer; }
    .tile:hover { background: var(--surface); }
    .tile.copied { border-color: var(--accent); }
    .art { display: flex; align-items: center; justify-content: center; min-height: 48px; }
    .icons .art svg { width: var(--icon-size); height: var(--icon-size); }
    .flags .art svg { width: var(--flag-size); height: var(--flag-size); }
    .logos .art svg { max-width: 100%; height: auto; }
    .name { color: var(--text); font-size: 12px; word-break: break-word; text-align: center; }
    .component { color: var(--muted); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-word; text-align: center; }
    .tile[hidden] { display: none; }
    @media (max-width: 640px) { header, main { padding-left: 16px; padding-right: 16px; } .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); } }
</style>
</head>
<body>
<header>
    <h1>fa-icons</h1>
    <input type="search" placeholder="Search" aria-label="Search" />
    <label>Icon size <span class="sizes">${[16, 20, 24, 32].map((size) => `<button data-size="${size}" aria-pressed="${size === 20}">${size}</button>`).join("")}</span></label>
    <label>Color <input type="color" value="#252b37" aria-label="Icon color" /></label>
    <span class="themes">${["light", "dark"].map((theme) => `<button data-theme="${theme}" aria-pressed="${theme === "light"}">${theme}</button>`).join("")}</span>
</header>
<main style="--icon-size: 20px; --flag-size: 20px">
${sections}
</main>
<script>
    const main = document.querySelector("main");
    document.querySelectorAll(".sizes button").forEach((button) => button.addEventListener("click", () => {
        document.querySelectorAll(".sizes button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        main.style.setProperty("--icon-size", button.dataset.size + "px");
        main.style.setProperty("--flag-size", button.dataset.size + "px");
    }));
    const color = document.querySelector('input[type="color"]');
    color.addEventListener("input", () => document.documentElement.style.setProperty("--icon", color.value));
    document.querySelectorAll(".themes button").forEach((button) => button.addEventListener("click", () => {
        document.querySelectorAll(".themes button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        document.documentElement.classList.toggle("dark", button.dataset.theme === "dark");
        document.documentElement.style.removeProperty("--icon");
    }));
    document.querySelector('input[type="search"]').addEventListener("input", (event) => {
        const query = event.target.value.trim().toLowerCase();
        document.querySelectorAll(".tile").forEach((tile) => (tile.hidden = !tile.dataset.search.includes(query)));
    });
    document.querySelectorAll(".tile").forEach((tile) => tile.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(tile.dataset.copy); } catch {}
        tile.classList.add("copied");
        setTimeout(() => tile.classList.remove("copied"), 800);
    }));
</script>
</body>
</html>
`;

mkdirSync(join(root, "preview"), { recursive: true });
writeFileSync(join(root, "preview/index.html"), html);
console.log("Wrote preview/index.html");
