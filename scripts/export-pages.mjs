import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceOrigin = process.env.STATIC_SOURCE_ORIGIN;
const canonicalOrigin = process.env.STATIC_CANONICAL_ORIGIN;
const basePath = process.env.STATIC_BASE_PATH ?? "";

if (!sourceOrigin || !canonicalOrigin) {
  throw new Error("STATIC_SOURCE_ORIGIN and STATIC_CANONICAL_ORIGIN are required");
}

if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error("STATIC_BASE_PATH must start with / and must not end with /");
}

const root = process.cwd();
const sourceDirectory = resolve(root, "dist", "client");
const outputDirectory = resolve(root, "pages-dist");

async function pruneGeneratedAssets(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await pruneGeneratedAssets(entryPath);
    } else if (
      /\.(?:map|woff2?)$/.test(entry.name) ||
      (/\.js$/.test(entry.name) && entry.name !== "family-tree.js")
    ) {
      await rm(entryPath, { force: true });
    }
  }
}

function prefixProjectPath(html) {
  if (!basePath) return html;

  return html
    .replace(
      /\b(href|src)="\/(?!\/)([^"]*)"/g,
      (_match, attribute, value) => `${attribute}="${basePath}/${value}"`,
    )
    .replace(
      /\b(imageSrcSet|srcSet)="([^"]*)"/g,
      (_match, attribute, value) =>
        `${attribute}="${value.replace(
          /(^|,\s*)\/(?!\/)/g,
          (_urlMatch, separator) => `${separator}${basePath}/`,
        )}"`,
    );
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

const response = await fetch(sourceOrigin);
if (!response.ok) throw new Error(`Static source returned ${response.status}`);

let html = await response.text();
html = html
  .replace(/<script\b(?![^>]*data-static-interaction)[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<link\b[^>]*rel="modulepreload"[^>]*\/?\s*>/gi, "")
  .replace(/\sdata-rsc-css-href="[^"]*"/g, "")
  .replace(/\sdata-precedence="[^"]*"/g, "")
  .replaceAll(sourceOrigin.replace(/\/$/, ""), canonicalOrigin.replace(/\/$/, ""))
  .trim();
html = prefixProjectPath(html);

await writeFile(resolve(outputDirectory, "index.html"), `${html}\n`, "utf8");
await pruneGeneratedAssets(outputDirectory);
await Promise.all(
  [".assetsignore", ".vite", "_headers"].map((assetPath) =>
    rm(resolve(outputDirectory, assetPath), { recursive: true, force: true }),
  ),
);
await writeFile(resolve(outputDirectory, ".nojekyll"), "", "utf8");
console.log(`Static Pages export written to ${outputDirectory}`);
