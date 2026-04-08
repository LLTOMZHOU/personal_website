import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, test } from "node:test";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { partitionJustifiedRows } from "../scripts/lib/content-renderers.mjs";
import { listFiles, readJson } from "../scripts/lib/fs-utils.mjs";
import { renderDocumentTitle } from "../scripts/lib/site-shell.mjs";

const ROOT = process.cwd();
const PAGES_DIR = path.resolve(ROOT, "pages");
const DIST_DIR = path.resolve(ROOT, "dist");
const SITE_URL = "http://127.0.0.1:4173";

let routeFixtures = [];

function getCaptureGroup(html, pattern, captureIndex = 1) {
  const match = html.match(pattern);
  return match?.[captureIndex] ?? null;
}

function collectAssetPaths(html) {
  const assetPaths = new Set();

  for (const match of html.matchAll(/<(?:link|script)\b[^>]+(?:href|src)="([^"]+)"/g)) {
    const assetPath = match[1];

    if (assetPath.startsWith("/")) {
      assetPaths.add(assetPath);
    }
  }

  return [...assetPaths];
}

function outputPathForRoute(route) {
  if (route === "/") {
    return path.join(DIST_DIR, "index.html");
  }

  const cleanRoute = route.replace(/^\/|\/$/g, "");
  return path.join(DIST_DIR, cleanRoute, "index.html");
}

async function loadRouteFixtures() {
  const pageFiles = await listFiles(PAGES_DIR, ".meta.json");

  return Promise.all(
    pageFiles.map(async (metadataPath) => {
      const metadata = await readJson(metadataPath);
      return {
        metadataPath,
        route: metadata.path,
        title: renderDocumentTitle(metadata.title),
        description: metadata.description
      };
    })
  );
}

async function runBuildCommand() {
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["build"], {
      cwd: ROOT,
      env: { ...process.env, SITE_URL },
      stdio: "pipe"
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pnpm build failed with code ${code}\n${stderr}`));
    });
  });
}

describe("static site smoke tests", () => {
  before(async () => {
    process.env.SITE_URL = SITE_URL;
    routeFixtures = await loadRouteFixtures();
    await runBuildCommand();
  });

  test("built output contains the homepage", async () => {
    const homepage = await readFile(path.join(DIST_DIR, "index.html"), "utf8");
    assert.match(homepage, /<!doctype html>/i);
    assert.match(homepage, /data-site-nav/);
  });

  test("each declared route serves core metadata and local assets", async () => {
    for (const fixture of routeFixtures) {
      const outputPath = outputPathForRoute(fixture.route);
      const html = await readFile(outputPath, "utf8");
      assert.match(html, new RegExp(`<title>${fixture.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
      assert.match(html, new RegExp(`<meta name="description" content="${fixture.description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
      assert.match(html, /<link rel="canonical" href="[^"]+">/);
      assert.match(html, /<meta property="og:title" content="[^"]+">/);
      assert.match(html, /<meta property="og:description" content="[^"]+">/);
      assert.match(html, /<nav[\s\S]*data-site-nav/);
      assert.match(html, /data-assistant-panel/);
      assert.match(html, /data-assistant-trigger/);

      const assetPaths = collectAssetPaths(html);
      assert.ok(assetPaths.length > 0, `${fixture.route} should include built assets`);

      for (const assetPath of assetPaths) {
        const assetFilePath = path.join(DIST_DIR, assetPath.slice(1));
        const assetStat = await stat(assetFilePath);
        assert.ok(assetStat.isFile(), `${fixture.route} asset ${assetPath} should exist in dist`);
      }
    }
  });

  test("homepage wires assistant shell and lazy assistant bundle", async () => {
    const html = await readFile(path.join(DIST_DIR, "index.html"), "utf8");

    const assistantPanel = getCaptureGroup(html, /data-assistant-src="([^"]+)"/);
    assert.ok(assistantPanel, "assistant panel should include a lazy bundle source");

    const siteScript = getCaptureGroup(html, /<script[^>]+src="([^"]+)"[^>]*><\/script>/);
    assert.ok(siteScript, "homepage should include the site bundle");

    const scriptText = await readFile(path.join(DIST_DIR, siteScript.slice(1)), "utf8");
    assert.match(scriptText, /data-assistant-trigger/);
    assert.match(scriptText, /aria-expanded/);
    assert.match(scriptText, /\.key\s*={2,3}\s*"\/"/);
  });

  test("photography album pages use smaller inline images and preserve full-size lightbox sources", async () => {
    const html = await readFile(path.join(DIST_DIR, "photography", "laguna-beach-july-2023", "index.html"), "utf8");

    assert.match(html, /cover@display\.webp/);
    assert.match(html, /001@display\.webp/);
    assert.match(html, /data-gallery-image-src="https:\/\/media\.yuxingzhou\.me\/photography\/laguna-beach-july-2023\/cover@full\.webp"/);
    assert.match(html, /data-gallery-image-src="https:\/\/media\.yuxingzhou\.me\/photography\/laguna-beach-july-2023\/001@full\.webp"/);
    assert.match(html, /assets\/gallery-[^"]+\.js/);

    const homepage = await readFile(path.join(DIST_DIR, "index.html"), "utf8");
    assert.doesNotMatch(homepage, /assets\/gallery-[^"]+\.js/);
  });

  test("los angeles album preview assets stay aligned with the intended full-size images", async () => {
    const html = await readFile(path.join(DIST_DIR, "photography", "los-angeles", "index.html"), "utf8");

    assert.match(html, /<button[^>]*data-gallery-image-index="0"[^>]*data-gallery-image-src="https:\/\/media\.yuxingzhou\.me\/photography\/los-angeles\/cover@full\.webp"[^>]*data-gallery-image-preview-src="https:\/\/media\.yuxingzhou\.me\/photography\/los-angeles\/cover@full\.webp"[^>]*>/);
    assert.match(html, /<button[^>]*data-gallery-image-index="2"[^>]*data-gallery-image-src="https:\/\/media\.yuxingzhou\.me\/photography\/los-angeles\/001@full\.webp"[^>]*data-gallery-image-preview-src="https:\/\/media\.yuxingzhou\.me\/photography\/los-angeles\/001@full\.webp"[^>]*>/);
    assert.match(html, /<button[^>]*data-gallery-image-index="4"[^>]*data-gallery-image-src="https:\/\/media\.yuxingzhou\.me\/photography\/los-angeles\/005@full\.webp"[^>]*data-gallery-image-preview-src="https:\/\/media\.yuxingzhou\.me\/photography\/los-angeles\/005@full\.webp"[^>]*>/);
    assert.doesNotMatch(html, /los-angeles\/002@full\.webp/);
  });

  test("photography index can curate album preview selections independently of album order", async () => {
    const html = await readFile(path.join(DIST_DIR, "photography", "index.html"), "utf8");

    assert.match(html, /Walt Disney Concert Hall in black and white/);
    assert.match(html, /A glowing lantern-like window cube suspended/);
    assert.match(html, /A brutalist tower with a helical ramp/);
    assert.doesNotMatch(html, /The Grand LA tower at twilight/);
    assert.doesNotMatch(html, /The Grand LA tower at golden hour/);
    assert.match(html, /Los Angeles[\s\S]*lg:grid-cols-2/);
  });

  test("photography album row partition avoids isolating portrait images in known mixed-aspect albums", async () => {
    for (const slug of ["getty-villa-sep-2022", "los-angeles", "pacific-coast", "san-francisco"]) {
      const album = await readJson(path.join(ROOT, "content", "photography", `${slug}.json`));
      const images = [album.cover, ...(album.items ?? [])].filter(Boolean);
      const rows = partitionJustifiedRows(images);

      assert.ok(
        rows.every((row) => row.length !== 1 || (row[0].width ?? 1) / Math.max(row[0].height ?? 1, 1) >= 0.85),
        `${slug} should not leave a portrait image alone in its own row`
      );
    }
  });
});
