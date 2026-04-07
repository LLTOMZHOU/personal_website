import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { build as viteBuild } from "vite";
import viteConfig from "../vite.config.mjs";
import { cleanDir, fileExists, listFiles, readJson, writeText } from "./lib/fs-utils.mjs";
import { getGeneratedPages, renderContentSource } from "./lib/content-renderers.mjs";
import { renderPage } from "./lib/site-shell.mjs";

const ROOT = process.cwd();
const DIST_DIR = path.resolve(ROOT, "dist");
const PAGES_DIR = path.resolve(ROOT, "pages");

function resolveSiteUrl() {
  const siteUrl = process.env.SITE_URL;

  if (!siteUrl) {
    throw new Error("SITE_URL must be set before building so canonical metadata is correct");
  }

  return siteUrl;
}

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
    (item) =>
      item.name === entryName ||
      (typeof item.src === "string" &&
        item.src.includes("/client/") &&
        item.src.endsWith(`/${entryName}.ts`))
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
  const siteUrl = resolveSiteUrl();
  const pageFiles = await listFiles(PAGES_DIR, ".html");
  const siteEntry = entryFilesFromManifest(manifest, "site");
  const assistantEntry = entryFilesFromManifest(manifest, "assistant");
  const generatedPages = await getGeneratedPages();

  for (const pagePath of pageFiles) {
    const metadataPath = pagePath.replace(/\.html$/, ".meta.json");

    if (!(await fileExists(metadataPath))) {
      throw new Error(`Missing metadata sidecar for ${pagePath}`);
    }

    const [rawBodyHtml, metadata] = await Promise.all([readFile(pagePath, "utf8"), readJson(metadataPath)]);
    const bodyHtml = metadata.contentRenderer
      ? await renderContentSource(metadata.contentRenderer)
      : rawBodyHtml;

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
      siteUrl,
      metadata: { ...metadata, path: route },
      bodyHtml,
      cssFiles: [...new Set(pageCss)],
      scriptFiles: [...new Set(pageScripts)],
      assistantSrc: assistantEntry.scripts[0] ?? null
    });

    await writeText(outputPathForRoute(route), html);
  }

  for (const generatedPage of generatedPages) {
    const route = normalizeRoute(generatedPage.metadata.path);
    const pageScripts = [...siteEntry.scripts];
    const pageCss = [...siteEntry.css];
    const bundleEntries = generatedPage.metadata.bundles ?? [];

    for (const bundleName of bundleEntries) {
      const bundle = entryFilesFromManifest(manifest, bundleName);
      pageScripts.push(...bundle.scripts);
      pageCss.push(...bundle.css);
    }

    const html = renderPage({
      siteUrl,
      metadata: { ...generatedPage.metadata, path: route },
      bodyHtml: generatedPage.bodyHtml,
      cssFiles: [...new Set(pageCss)],
      scriptFiles: [...new Set(pageScripts)],
      assistantSrc: assistantEntry.scripts[0] ?? null
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
