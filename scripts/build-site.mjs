import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { build as viteBuild } from "vite";
import viteConfig from "../vite.config.mjs";
import { cleanDir, fileExists, listFiles, readJson, writeText } from "./lib/fs-utils.mjs";
import { renderPage } from "./lib/site-shell.mjs";

const ROOT = process.cwd();
const DIST_DIR = path.resolve(ROOT, "dist");
const PAGES_DIR = path.resolve(ROOT, "pages");
const SITE_URL = process.env.SITE_URL ?? "http://127.0.0.1:4173";

function normalizeRoute(route) {
  if (typeof route !== "string" || route.length === 0) {
    throw new Error("Route must be a non-empty string");
  }

  if (!route.startsWith("/")) {
    throw new Error(`Route must start with "/": ${route}`);
  }

  const normalized = route === "/" ? "/" : `${route.replace(/\/+$/, "")}/`;
  const withoutLeadingSlash = normalized.slice(1);

  if (withoutLeadingSlash.includes("..")) {
    throw new Error(`Route may not contain "..": ${route}`);
  }

  return normalized;
}

function resolveInsideDist(...segments) {
  const resolved = path.resolve(DIST_DIR, ...segments);
  const relative = path.relative(DIST_DIR, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Build output escaped dist: ${resolved}`);
  }

  return resolved;
}

function routeFromPage(pagePath) {
  const relative = path.relative(PAGES_DIR, pagePath);
  const normalized = relative.replace(/\\/g, "/");

  if (normalized === "index.html") {
    return "/";
  }

  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -10)}/`;
  }

  return `/${normalized.replace(/\.html$/, "")}/`;
}

function outputPathForRoute(route) {
  const normalizedRoute = normalizeRoute(route);

  if (normalizedRoute === "/") {
    return resolveInsideDist("index.html");
  }

  const cleanRoute = normalizedRoute.replace(/^\/|\/$/g, "");
  return resolveInsideDist(cleanRoute, "index.html");
}

function entryFilesFromManifest(manifest, entryName) {
  const entry = Object.values(manifest).find(
    (item) => item.name === entryName || item.src === `src/client/${entryName}.ts`
  );

  if (!entry) {
    throw new Error(`Missing Vite manifest entry for "${entryName}"`);
  }

  const scripts = entry.file ? [`/${entry.file}`] : [];
  const css = (entry.css ?? []).map((file) => `/${file}`);
  return { scripts, css };
}

async function buildAssets() {
  await viteBuild(viteConfig);
  const manifestPath = path.join(DIST_DIR, ".vite", "manifest.json");
  return readJson(manifestPath);
}

async function assemblePages(manifest) {
  const pageFiles = await listFiles(PAGES_DIR, ".html");
  const siteEntry = entryFilesFromManifest(manifest, "site");
  const assistantEntry = entryFilesFromManifest(manifest, "assistant");

  for (const pagePath of pageFiles) {
    const metadataPath = pagePath.replace(/\.html$/, ".meta.json");

    if (!(await fileExists(metadataPath))) {
      throw new Error(`Missing metadata sidecar for ${pagePath}`);
    }

    const [bodyHtml, metadata] = await Promise.all([
      readFile(pagePath, "utf8"),
      readJson(metadataPath)
    ]);

    const route = normalizeRoute(metadata.path ?? routeFromPage(pagePath));
    const bundleEntries = metadata.bundles ?? [];
    const pageScripts = [...siteEntry.scripts];
    const pageCss = [...siteEntry.css];

    for (const bundleName of bundleEntries) {
      const bundle = entryFilesFromManifest(manifest, bundleName);
      pageScripts.push(...bundle.scripts);
      pageCss.push(...bundle.css);
    }

    const html = renderPage({
      siteUrl: SITE_URL,
      metadata: { ...metadata, path: route },
      bodyHtml,
      cssFiles: [...new Set(pageCss)],
      scriptFiles: [...new Set(pageScripts)],
      assistantSrc: assistantEntry.scripts[0]
    });

    await writeText(outputPathForRoute(route), html);
  }
}

export async function buildProject() {
  await cleanDir(DIST_DIR);
  const manifest = await buildAssets();
  await assemblePages(manifest);
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  buildProject().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
