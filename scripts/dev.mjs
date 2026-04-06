import path from "node:path";
import { existsSync, watch } from "node:fs";
import { buildProject } from "./build-site.mjs";
import { startPreviewServer } from "./preview.mjs";

process.env.SITE_URL ??= "http://127.0.0.1:4173";

const WATCH_DIRS = ["pages", "src", "public", "content"]
  .map((dir) => path.join(process.cwd(), dir))
  .filter((dir) => existsSync(dir));

let building = false;
let queued = false;

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

for (const dir of WATCH_DIRS) {
  watch(dir, { recursive: true }, () => {
    rebuild().catch((error) => {
      console.error(`rebuild failed for watch path: ${dir}`, error);
    });
  });
}
