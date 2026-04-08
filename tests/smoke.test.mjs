import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, test } from "node:test";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
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
});
