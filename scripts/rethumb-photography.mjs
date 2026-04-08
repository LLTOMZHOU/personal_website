/**
 * Re-generates and re-uploads only the @thumb.webp variant for all albums,
 * using the local source files. Run this after changing thumb quality/size settings.
 *
 *   node scripts/rethumb-photography.mjs
 */

import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFile = promisify(execFileCallback);

const PHOTOS_BASE = process.env.PHOTOS_BASE ?? "/Users/yuxingzhou/Local_Projects/personal_website_photos";
const MEDIA_ORIGIN = "https://media.yuxingzhou.me";
const BUCKET = "yuxingzhou-media";
const NODE_20_BIN = process.env.NODE_20_BIN ?? "/Users/yuxingzhou/.nvm/versions/node/v20.19.4/bin";

const THUMB = { maxLongEdge: 1080, quality: 85, cacheControl: "public, max-age=31536000, immutable" };

// Mirror of ALBUMS in ingest-photography.mjs — cover first, then items in order.
const ALBUMS = [
  {
    slug: "chicago",
    folder: "Chicago",
    images: ["IMG_1649-Enhanced.jpg", "IMG_1629.jpg", "IMG_1589.jpg", "IMG_1605.jpg"]
  },
  {
    slug: "getty-villa-sep-2022",
    folder: "Getty Villa Sep 2022",
    images: ["IMG_0394-2.jpg", "IMG_0385-2.jpg", "IMG_0384-2.jpg", "IMG_0386-2.jpg", "IMG_0388-2.jpg"]
  },
  {
    slug: "pacific-coast",
    folder: "Pacific Coast (Various times)",
    images: ["IMG_2365.jpg", "IMG_1010.jpg", "IMG_1785-Enhanced-NR.jpg", "IMG_1514.jpg", "IMG_1531.jpg", "IMG_1517.jpg", "IMG_1788-Enhanced-NR.jpg", "IMG_1778-Enhanced-NR.jpg"]
  },
  {
    slug: "laguna-beach-july-2023",
    folder: "laguna_beach_July_2023",
    images: ["IMG_1479.jpg", "IMG_1471.jpg", "IMG_1466.jpg", "IMG_1467.jpg", "IMG_1470.jpg", "IMG_1468.jpg"]
  },
  {
    slug: "los-angeles",
    folder: "los angeles",
    images: ["IMG_0180.jpg", "IMG_0650-Edit.jpg", "IMG_0904.jpg", "IMG_0713_4_5.jpg", "IMG_0223.jpg", "IMG_0155.jpg", "IMG_0365-2.jpg", "IMG_1018.jpg"]
  },
  {
    slug: "palm-springs-nov-2023",
    folder: "Palm Spring Nov 2023",
    images: ["IMG_1735.jpg", "IMG_1738-Enhanced-NR.jpg", "IMG_1743.jpg", "IMG_1730.jpg", "IMG_1732.jpg", "IMG_1745-Enhanced-NR.jpg"]
  },
  {
    slug: "san-francisco",
    folder: "San Francisco ",
    images: ["IMG_2624.jpg", "IMG_2323.jpg", "IMG_2333.jpg", "IMG_2336.jpg"]
  }
];

function stem(index) {
  return index === 0 ? "cover" : String(index).padStart(3, "0");
}

function objectKey(slug, s) {
  return `photography/${slug}/${s}@thumb.webp`;
}

function publicUrl(key) {
  return `${MEDIA_ORIGIN}/${key}`;
}

async function generateThumb(filePath, outPath) {
  await sharp(filePath)
    .rotate()
    .resize({ width: THUMB.maxLongEdge, height: THUMB.maxLongEdge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: THUMB.quality, effort: 6 })
    .toFile(outPath);
}

async function upload(objectKeyPath, filePath) {
  await execFile("npx", [
    "wrangler", "r2", "object", "put",
    `${BUCKET}/${objectKeyPath}`,
    "--file", filePath,
    "--content-type", "image/webp",
    "--cache-control", THUMB.cacheControl,
    "--remote"
  ], {
    cwd: "/tmp",
    env: { ...process.env, PATH: `${NODE_20_BIN}:${process.env.PATH}` },
    maxBuffer: 1024 * 1024 * 16
  });
}

async function verify(url) {
  for (let i = 1; i <= 8; i++) {
    const res = await fetch(`${url}?v=${Date.now()}-${i}`, { method: "HEAD" });
    if (res.ok) return;
    if (i < 8) await new Promise(r => setTimeout(r, 1500));
    else throw new Error(`Verification failed for ${url}: ${res.status}`);
  }
}

async function main() {
  const workingDir = await mkdtemp(path.join(os.tmpdir(), "rethumb-"));

  try {
    for (const album of ALBUMS) {
      console.log(`\n── ${album.slug}`);

      for (let i = 0; i < album.images.length; i++) {
        const s = stem(i);
        const srcFile = path.join(PHOTOS_BASE, album.folder, album.images[i]);
        const outFile = path.join(workingDir, `${album.slug}-${s}@thumb.webp`);
        const key = objectKey(album.slug, s);

        await generateThumb(srcFile, outFile);
        await upload(key, outFile);
        await verify(publicUrl(key));
        console.log(`  ✓ ${s}`);
      }
    }

    console.log("\n✓ All thumbs re-generated and uploaded.");
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
