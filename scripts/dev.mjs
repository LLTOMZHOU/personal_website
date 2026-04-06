import path from "node:path";
import { existsSync, watch } from "node:fs";
import { readdir } from "node:fs/promises";
import { buildProject } from "./build-site.mjs";
import { startPreviewServer } from "./preview.mjs";

process.env.SITE_URL ??= "http://127.0.0.1:4173";

const WATCH_DIRS = ["pages", "src", "public", "content"]
  .map((dir) => path.join(process.cwd(), dir))
  .filter((dir) => existsSync(dir));

let building = false;
let queued = false;
const activeWatchers = new Map();

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }

  building = true;
  try {
    await buildProject();
    console.log("rebuilt dist/");
  } catch (error) {
    console.error(error);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      await rebuild();
    }
  }
}

await rebuild();
await startPreviewServer();

async function collectDirectories(rootDir) {
  const directories = [rootDir];
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    directories.push(...(await collectDirectories(path.join(rootDir, entry.name))));
  }

  return directories;
}

function handleWatchEvent(dir) {
  rebuild().catch((error) => {
    console.error(`rebuild failed for watch path: ${dir}`, error);
  });
}

async function watchDirectoryTree(rootDir) {
  const directories = await collectDirectories(rootDir);

  for (const dir of directories) {
    if (activeWatchers.has(dir)) {
      continue;
    }

    const watcher = watch(dir, () => {
      handleWatchEvent(dir);
      refreshWatches().catch((error) => {
        console.error(`failed to refresh watchers for ${rootDir}`, error);
      });
    });

    activeWatchers.set(dir, watcher);
  }
}

async function refreshWatches() {
  for (const dir of WATCH_DIRS) {
    const onChange = () => handleWatchEvent(dir);

    try {
      if (!activeWatchers.has(dir)) {
        activeWatchers.set(dir, watch(dir, { recursive: true }, onChange));
      }
    } catch {
      await watchDirectoryTree(dir);
    }
  }
}

await refreshWatches();
