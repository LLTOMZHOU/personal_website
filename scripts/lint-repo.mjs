import path from "node:path";
import { readFile } from "node:fs/promises";
import { CONTENT_RENDERERS } from "./lib/content-renderers.mjs";
import { fileExists, listFiles, readJson } from "./lib/fs-utils.mjs";

const ROOT = process.cwd();
const PAGES_DIR = path.resolve(ROOT, "pages");
const SRC_CLIENT_DIR = path.resolve(ROOT, "src", "client");

const REQUIRED_METADATA_KEYS = ["title", "description", "path", "section", "ogImage", "bundles", "bodyClass"];
const OPTIONAL_METADATA_KEYS = ["canonicalUrl", "noIndex", "contentRenderer"];
const ALLOWED_METADATA_KEYS = new Set([...REQUIRED_METADATA_KEYS, ...OPTIONAL_METADATA_KEYS]);
const ALLOWED_SECTIONS = new Set(["home", "projects", "writing", "photography", "ai-media", "about"]);
const ALLOWED_CONTENT_RENDERERS = new Set(Object.values(CONTENT_RENDERERS));
const FORBIDDEN_PAGE_PATTERNS = [
  { pattern: /<html\b/i, message: "Authored pages must not include <html>." },
  { pattern: /<body\b/i, message: "Authored pages must not include <body>." },
  { pattern: /<head\b/i, message: "Authored pages must not include <head>." },
  { pattern: /<!doctype/i, message: "Authored pages must not include a document doctype." }
];

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

async function readDeclaredBundleNames() {
  const clientFiles = await listFiles(SRC_CLIENT_DIR, ".ts");
  return new Set(
    clientFiles
      .filter((filePath) => !filePath.includes(`${path.sep}assistant${path.sep}`))
      .map((filePath) => path.basename(filePath, ".ts"))
  );
}

async function validatePageHtml(pagePath, errors) {
  const html = await readFile(pagePath, "utf8");

  for (const { pattern, message } of FORBIDDEN_PAGE_PATTERNS) {
    if (pattern.test(html)) {
      errors.push(`${path.relative(ROOT, pagePath)}: ${message}`);
    }
  }

  if (html.includes("/dist/")) {
    errors.push(`${path.relative(ROOT, pagePath)}: Source pages must not reference generated dist assets.`);
  }
}

function validateMetadataShape(metadata, metadataPath, errors) {
  for (const key of REQUIRED_METADATA_KEYS) {
    if (!(key in metadata)) {
      errors.push(`${path.relative(ROOT, metadataPath)}: Missing required metadata key "${key}".`);
    }
  }

  for (const key of Object.keys(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      errors.push(`${path.relative(ROOT, metadataPath)}: Unknown metadata key "${key}".`);
    }
  }

  if (typeof metadata.title !== "string" || metadata.title.trim() === "") {
    errors.push(`${path.relative(ROOT, metadataPath)}: "title" must be a non-empty string.`);
  }

  if (typeof metadata.description !== "string" || metadata.description.trim() === "") {
    errors.push(`${path.relative(ROOT, metadataPath)}: "description" must be a non-empty string.`);
  }

  if (typeof metadata.section !== "string" || !ALLOWED_SECTIONS.has(metadata.section)) {
    errors.push(
      `${path.relative(ROOT, metadataPath)}: "section" must be one of ${Array.from(ALLOWED_SECTIONS).join(", ")}.`
    );
  }

  if (typeof metadata.ogImage !== "string") {
    errors.push(`${path.relative(ROOT, metadataPath)}: "ogImage" must be a string.`);
  }

  if (typeof metadata.bodyClass !== "string") {
    errors.push(`${path.relative(ROOT, metadataPath)}: "bodyClass" must be a string.`);
  }

  if (!Array.isArray(metadata.bundles) || metadata.bundles.some((bundle) => typeof bundle !== "string")) {
    errors.push(`${path.relative(ROOT, metadataPath)}: "bundles" must be an array of strings.`);
  }

  if ("canonicalUrl" in metadata && typeof metadata.canonicalUrl !== "string") {
    errors.push(`${path.relative(ROOT, metadataPath)}: "canonicalUrl" must be a string when present.`);
  }

  if ("noIndex" in metadata && typeof metadata.noIndex !== "boolean") {
    errors.push(`${path.relative(ROOT, metadataPath)}: "noIndex" must be a boolean when present.`);
  }

  if ("contentRenderer" in metadata) {
    if (typeof metadata.contentRenderer !== "string" || metadata.contentRenderer.trim() === "") {
      errors.push(`${path.relative(ROOT, metadataPath)}: "contentRenderer" must be a non-empty string when present.`);
    } else if (!ALLOWED_CONTENT_RENDERERS.has(metadata.contentRenderer)) {
      errors.push(
        `${path.relative(ROOT, metadataPath)}: "contentRenderer" must be one of ${Array.from(ALLOWED_CONTENT_RENDERERS).join(", ")}.`
      );
    }
  }
}

async function main() {
  const pageFiles = await listFiles(PAGES_DIR, ".html");
  const bundleNames = await readDeclaredBundleNames();
  const errors = [];
  const seenRoutes = new Map();

  for (const pagePath of pageFiles) {
    const metadataPath = pagePath.replace(/\.html$/, ".meta.json");

    if (!(await fileExists(metadataPath))) {
      errors.push(`${path.relative(ROOT, pagePath)}: Missing metadata sidecar.`);
      continue;
    }

    await validatePageHtml(pagePath, errors);

    let metadata;

    try {
      metadata = await readJson(metadataPath);
    } catch (error) {
      errors.push(`${path.relative(ROOT, metadataPath)}: Failed to parse JSON. ${error instanceof Error ? error.message : error}`);
      continue;
    }

    validateMetadataShape(metadata, metadataPath, errors);

    try {
      const route = normalizeRoute(metadata.path);
      const existing = seenRoutes.get(route);

      if (existing) {
        errors.push(
          `${path.relative(ROOT, metadataPath)}: Duplicate route "${route}" already declared in ${path.relative(ROOT, existing)}.`
        );
      } else {
        seenRoutes.set(route, metadataPath);
      }
    } catch (error) {
      errors.push(`${path.relative(ROOT, metadataPath)}: ${error instanceof Error ? error.message : error}`);
    }

    for (const bundleName of metadata.bundles ?? []) {
      if (!bundleNames.has(bundleName)) {
        errors.push(
          `${path.relative(ROOT, metadataPath)}: Unknown bundle "${bundleName}". Expected one of ${Array.from(bundleNames).sort().join(", ")}.`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error("Repository contract violations:\n");

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(`Repository contract check passed for ${pageFiles.length} pages.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
