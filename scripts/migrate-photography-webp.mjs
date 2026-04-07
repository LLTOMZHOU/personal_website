import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { listFiles, readJson, writeText } from "./lib/fs-utils.mjs";

const execFile = promisify(execFileCallback);

const ROOT = process.cwd();
const PHOTOGRAPHY_DIR = path.resolve(ROOT, "content", "photography");
const MEDIA_ORIGIN = "https://media.yuxingzhou.me";
const BUCKET = "yuxingzhou-media";
const WEBP_URL_PATTERN = /\.webp(?:$|[?#])/i;

const VARIANTS = [
  { field: "src", suffix: "@full.webp", maxLongEdge: null, quality: 92, cacheControl: "public, max-age=31536000, immutable" },
  { field: "display", suffix: "@display.webp", maxLongEdge: 1800, quality: 86, cacheControl: "public, max-age=31536000, immutable" },
  { field: "thumb", suffix: "@thumb.webp", maxLongEdge: 720, quality: 78, cacheControl: "public, max-age=31536000, immutable" }
];

function albumMediaEntries(album) {
  return [album.cover, ...(album.items ?? [])].filter(Boolean);
}

function objectStemFromUrl(url) {
  const pathname = new URL(url).pathname;
  const baseName = path.basename(pathname);
  const extension = path.extname(baseName);
  return extension ? baseName.slice(0, -extension.length) : baseName;
}

function objectKeyForVariant(albumSlug, sourceUrl, variantSuffix) {
  return `photography/${albumSlug}/${objectStemFromUrl(sourceUrl)}${variantSuffix}`;
}

function publicUrlForKey(objectKey) {
  return `${MEDIA_ORIGIN}/${objectKey}`;
}

async function downloadSourceBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download source ${url}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function resizeForVariant(image, maxLongEdge) {
  if (!maxLongEdge) {
    return image;
  }

  return image.resize({
    width: maxLongEdge,
    height: maxLongEdge,
    fit: "inside",
    withoutEnlargement: true
  });
}

async function writeVariant(sourceBuffer, targetFilePath, variant) {
  const pipeline = resizeForVariant(sharp(sourceBuffer).rotate(), variant.maxLongEdge).webp({
    quality: variant.quality,
    effort: 6
  });

  await pipeline.toFile(targetFilePath);
}

async function uploadObject(objectKey, filePath) {
  await execFile("pnpm", [
    "dlx",
    "wrangler",
    "r2",
    "object",
    "put",
    `${BUCKET}/${objectKey}`,
    "--file",
    filePath,
    "--content-type",
    "image/webp",
    "--cache-control",
    "public, max-age=31536000, immutable",
    "--remote"
  ], {
    cwd: ROOT,
    maxBuffer: 1024 * 1024 * 16
  });
}

async function verifyPublicUrl(url, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const verifyUrl = `${url}?verify=${Date.now()}-${attempt}`;
    const response = await fetch(verifyUrl, { method: "HEAD" });

    if (response.ok) {
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.startsWith("image/webp")) {
        throw new Error(`Unexpected content type for ${url}: ${contentType || "missing"}`);
      }

      return;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
    }

    if (attempt === maxAttempts) {
      throw new Error(`Public verification failed for ${url}: ${response.status} ${response.statusText}`);
    }
  }
}

async function processImage(albumSlug, image, workingDir) {
  const candidates = [image.originalSrc, image.src].filter(
    (value) => typeof value === "string" && value.trim() !== ""
  );
  const sourceUrl = candidates.find((value) => !WEBP_URL_PATTERN.test(value));

  if (!sourceUrl) {
    throw new Error(`Could not find a non-WebP source for ${albumSlug}`);
  }

  image.originalSrc = sourceUrl;
  const sourceBuffer = await downloadSourceBuffer(sourceUrl);

  for (const variant of VARIANTS) {
    const objectKey = objectKeyForVariant(albumSlug, sourceUrl, variant.suffix);
    const targetFilePath = path.join(workingDir, path.basename(objectKey));
    await writeVariant(sourceBuffer, targetFilePath, variant);
    await uploadObject(objectKey, targetFilePath);
    await verifyPublicUrl(publicUrlForKey(objectKey));
    image[variant.field] = publicUrlForKey(objectKey);
  }
}

async function processAlbum(albumPath, workingDir) {
  const album = await readJson(albumPath);

  if (!album?.slug || album.slug === "placeholder") {
    return false;
  }

  for (const image of albumMediaEntries(album)) {
    await processImage(album.slug, image, workingDir);
  }

  await writeText(albumPath, `${JSON.stringify(album, null, 2)}\n`);
  return true;
}

async function main() {
  const albumPaths = await listFiles(PHOTOGRAPHY_DIR, ".json");
  const workingDir = await mkdtemp(path.join(os.tmpdir(), "photography-webp-"));
  const processedAlbums = [];

  try {
    await mkdir(workingDir, { recursive: true });

    for (const albumPath of albumPaths) {
      const processed = await processAlbum(albumPath, workingDir);

      if (processed) {
        processedAlbums.push(path.basename(albumPath));
      }
    }

    console.log(`Processed ${processedAlbums.length} photography album JSON files.`);
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
