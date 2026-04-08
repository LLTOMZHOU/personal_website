/**
 * Photography ingestion script.
 *
 * For each album in ALBUMS:
 *   1. Reads local JPEG files
 *   2. Generates WebP derivatives (full, display, thumb) via sharp
 *   3. Uploads the original JPEG and all derivatives to R2
 *   4. Verifies public delivery URLs
 *   5. Writes the album JSON to content/photography/<slug>.json
 *
 * Run from repo root:
 *   node scripts/ingest-photography.mjs
 *
 * Wrangler is invoked from /tmp with an explicit Node 20 PATH prefix to avoid
 * the repo-local Node version conflict.
 */

import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { writeText } from "./lib/fs-utils.mjs";

const execFile = promisify(execFileCallback);

const ROOT = process.cwd();
const PHOTOGRAPHY_DIR = path.resolve(ROOT, "content", "photography");
const PHOTOS_BASE = "/Users/yuxingzhou/Local_Projects/personal_website_photos";
const MEDIA_ORIGIN = "https://media.yuxingzhou.me";
const BUCKET = "yuxingzhou-media";
const NODE_20_BIN = "/Users/yuxingzhou/.nvm/versions/node/v20.19.4/bin";

const VARIANTS = [
  { field: "src",     suffix: "@full.webp",    maxLongEdge: null, quality: 92, cacheControl: "public, max-age=31536000, immutable" },
  { field: "display", suffix: "@display.webp", maxLongEdge: 1800, quality: 86, cacheControl: "public, max-age=31536000, immutable" },
  { field: "thumb",   suffix: "@thumb.webp",   maxLongEdge: 1080, quality: 85, cacheControl: "public, max-age=31536000, immutable" }
];

// ---------------------------------------------------------------------------
// Album definitions
// ---------------------------------------------------------------------------

const ALBUMS = [
  {
    slug: "chicago",
    title: "Chicago",
    description: "Architectural studies in Chicago: the Marina City towers from street level and sky, the Chicago Architecture Center, and a structural model on display.",
    folder: "Chicago",
    cover: { file: "IMG_1649-Enhanced.jpg", alt: "Twin Marina City towers rising into a clear blue sky, their circular balconies stacked in a honeycomb pattern." },
    items: [
      { file: "IMG_1629.jpg",         alt: "Marina City towers and an adjacent dark glass skyscraper against a sky of breaking storm clouds." },
      { file: "IMG_1589.jpg",         alt: "Chicago Architecture Center facade framed by a colorful street banner, curtain-wall tower reflections behind." },
      { file: "IMG_1605.jpg",         alt: "A wooden cross-beam structural model at the Chicago Architecture Center with a tower facade in the background." }
    ]
  },
  {
    slug: "getty-villa-sep-2022",
    title: "Getty Villa, September 2022",
    description: "Classical architecture and garden geometry at the Getty Villa in Malibu: coffered ceilings, a reflecting pool, koi ponds, and ancient sculpture in gallery light.",
    folder: "Getty Villa Sep 2022",
    cover: { file: "IMG_0394-2.jpg", alt: "Looking up through Ionic columns at a coffered ceiling with gilded diamond-pattern tiles and a pendant lamp against blue sky." },
    items: [
      { file: "IMG_0385-2.jpg", alt: "The Getty Villa's main reflecting pool stretching between pergola columns and clipped hedges, terracotta roofline beyond." },
      { file: "IMG_0384-2.jpg", alt: "Detail of the Getty Villa exterior: white stucco frieze with terracotta antefixes above Ionic columns and gridded windows." },
      { file: "IMG_0386-2.jpg", alt: "Lily pads, a white water lily, and koi moving through the sunlit shallow water of a garden pond." },
      { file: "IMG_0388-2.jpg", alt: "A large Calyx krater with relief figures illuminated against a dark gallery at the Getty Villa." }
    ]
  },
  {
    slug: "pacific-coast",
    title: "Pacific Coast",
    description: "Pacific Coast studies across multiple visits: Big Sur sea cliffs, beach sunsets, a pier at blue hour, palm trees at dusk, and Highway 1.",
    folder: "Pacific Coast (Various times)",
    cover: { file: "IMG_2365.jpg",               alt: "Sunlit sea cliffs at Big Sur dropping to deep blue water with a rocky islet below." },
    items: [
      { file: "IMG_1010.jpg",               alt: "Stone cairns silhouetted against a vivid orange and gold Pacific sunset over a rocky beach." },
      { file: "IMG_1785-Enhanced-NR.jpg",   alt: "A long pier extending over blue-grey water at dusk, pink and blue gradient sky above, palm trees at its end." },
      { file: "IMG_1514.jpg",               alt: "A wave crashing white against a rock jetty with a dark mountain headland rising along the coast." },
      { file: "IMG_1531.jpg",               alt: "Two tall fan palms against a fading blue sky at dusk, the ocean visible to the right." },
      { file: "IMG_1517.jpg",               alt: "A white pickup truck on Highway 1 with the Pacific and a coastal mountain headland behind." },
      { file: "IMG_1788-Enhanced-NR.jpg",   alt: "A rose-and-violet afterglow over the ocean with island silhouettes, framed by a chain-link fence." },
      { file: "IMG_1778-Enhanced-NR.jpg",   alt: "A closed pier gate at blue hour, the long pier lit and stretching into a still-dark ocean beyond." }
    ]
  },
  {
    slug: "laguna-beach-july-2023",
    title: "Laguna Beach, July 2023",
    description: "A dusk sequence through Laguna Beach: a golden sunset over utility lines, a corridor framing the ocean, street life at the intersection, the transit trolley, a coastal mural, and warm-lit storefronts.",
    folder: "laguna_beach_July_2023",
    cover: { file: "IMG_1479.jpg", alt: "A street lamp and utility lines cutting across a glowing golden sunset sky above Laguna Beach." },
    items: [
      { file: "IMG_1471.jpg", alt: "A corridor between teal stucco walls and balconies opening onto the Pacific at dusk." },
      { file: "IMG_1466.jpg", alt: "A red Camaro and motorcycles stopped at a Laguna Beach crosswalk in late-afternoon light." },
      { file: "IMG_1467.jpg", alt: "Laguna Beach Transit trolley moving through an intersection against a warm evening sky." },
      { file: "IMG_1470.jpg", alt: "A large ocean-themed mural covering a building wall with the Pacific and palm trees behind." },
      { file: "IMG_1468.jpg", alt: "Warm evening light on The Saloon and Pepper Tree facade with a rainbow flag in the foreground." }
    ]
  },
  {
    slug: "los-angeles",
    title: "Los Angeles",
    description: "A Los Angeles sequence moving between brutalist landmarks, The Grand by Frank Gehry at golden hour, the Walt Disney Concert Hall and Cathedral of Our Lady of the Angels in monochrome, a Pacific sunset, and stone cairns at dusk.",
    folder: "los angeles",
    cover: { file: "IMG_0180.jpg",     alt: "Sharp concrete skylights and angular rooflines in monochrome against a flat sky." },
    items: [
      { file: "IMG_0650-Edit.jpg", alt: "The Grand LA tower at golden hour, its stacked glass volumes catching sunlight against a deep blue sky." },
      { file: "IMG_0904.jpg",     alt: "The Grand LA tower at twilight, lit windows glowing purple-gold against a darkening sky." },
      { file: "IMG_0713_4_5.jpg", alt: "Walt Disney Concert Hall in black and white, its billowing stainless steel curves across an empty street." },
      { file: "IMG_0223.jpg",     alt: "A glowing lantern-like window cube suspended in a stone facade at the Cathedral of Our Lady of the Angels." },
      { file: "IMG_0155.jpg",     alt: "A brutalist tower with a helical ramp wrapped around a perforated concrete shaft, palm trees below in golden light." },
      { file: "IMG_0365-2.jpg",   alt: "A still Pacific inlet at dusk under a gradient sky from coral to deep blue." },
      { file: "IMG_1018.jpg",     alt: "Two stone cairns silhouetted in sharp relief against a deep orange and red Pacific sunset." }
    ]
  },
  {
    slug: "palm-springs-nov-2023",
    title: "Palm Springs, November 2023",
    description: "Interior studies at the Palm Springs Art Museum: wide gallery rooms, a spider sculpture under a curved skylight, a starburst chandelier, a geometric illuminated sphere, and a Kali Artographer retrospective.",
    folder: "Palm Spring Nov 2023",
    cover: { file: "IMG_1735.jpg",               alt: "A symmetric gallery room at the Palm Springs Art Museum with a gridded industrial ceiling and colorful works on white walls." },
    items: [
      { file: "IMG_1738-Enhanced-NR.jpg", alt: "A large spider sculpture mounted on a curved white wall beneath an arched skylight grid, in black and white." },
      { file: "IMG_1743.jpg",             alt: "A starburst chandelier suspended in a warm circular alcove with ribbed walls." },
      { file: "IMG_1730.jpg",             alt: "A geometric illuminated sphere made of interlocking polyhedra glowing in a dark gallery." },
      { file: "IMG_1732.jpg",             alt: "Wide black-and-white shot of the Kali Artographer 1932–2019 retrospective entrance wall with a gallery visitor beyond." },
      { file: "IMG_1745-Enhanced-NR.jpg", alt: "A few red rose petals scattered across dark concrete steps in near darkness." }
    ]
  },
  {
    slug: "san-francisco",
    title: "San Francisco",
    description: "San Francisco: the Transamerica Pyramid from its base, a downtown street canyon with the Bay Bridge in the distance, Chinatown lanterns and street life, and the Gold Mountain Sagely Monastery sign.",
    folder: "San Francisco ",
    cover: { file: "IMG_2624.jpg", alt: "Looking straight up the Transamerica Pyramid from its base, its textured concrete taper rising into broken clouds." },
    items: [
      { file: "IMG_2323.jpg", alt: "A downtown San Francisco street canyon with the Bay Bridge visible between towers at the far end." },
      { file: "IMG_2333.jpg", alt: "Chinatown street with red lanterns, a centered 'Do Not Enter' sign on a lamp post, and a crowd beyond." },
      { file: "IMG_2336.jpg", alt: "The Gold Mountain Sagely Monastery sign in Chinese characters and English, Chinatown skyline behind." }
    ]
  }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function localFilePath(folder, file) {
  return path.join(PHOTOS_BASE, folder, file);
}

function stemFromFile(file) {
  return path.basename(file, path.extname(file));
}

function objectKey(slug, stem, suffix) {
  return `photography/${slug}/${stem}${suffix}`;
}

function publicUrl(key) {
  return `${MEDIA_ORIGIN}/${key}`;
}

async function getDimensions(filePath) {
  const meta = await sharp(filePath).rotate().metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

async function generateWebp(filePath, outputPath, maxLongEdge, quality) {
  let pipeline = sharp(filePath).rotate();

  if (maxLongEdge) {
    pipeline = pipeline.resize({
      width: maxLongEdge,
      height: maxLongEdge,
      fit: "inside",
      withoutEnlargement: true
    });
  }

  await pipeline.webp({ quality, effort: 6 }).toFile(outputPath);
}

async function uploadToR2(objectKeyPath, filePath, contentType, cacheControl) {
  const args = [
    "wrangler", "r2", "object", "put",
    `${BUCKET}/${objectKeyPath}`,
    "--file", filePath,
    "--content-type", contentType,
    "--cache-control", cacheControl,
    "--remote"
  ];

  await execFile("npx", args, {
    cwd: "/tmp",
    env: { ...process.env, PATH: `${NODE_20_BIN}:${process.env.PATH}` },
    maxBuffer: 1024 * 1024 * 16
  });
}

async function verifyUrl(url, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${url}?v=${Date.now()}-${attempt}`, { method: "HEAD" });

    if (response.ok) {
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.startsWith("image/")) {
        throw new Error(`Unexpected content-type for ${url}: ${contentType}`);
      }

      return;
    }

    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 1500));
    } else {
      throw new Error(`Verification failed for ${url}: ${response.status}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Per-image processing
// ---------------------------------------------------------------------------

async function processImage(slug, stem, filePath, workingDir) {
  const { width, height } = await getDimensions(filePath);
  const result = { width, height, originalSrc: publicUrl(objectKey(slug, stem, ".jpg")) };

  // Upload original JPEG
  await uploadToR2(
    objectKey(slug, stem, ".jpg"),
    filePath,
    "image/jpeg",
    "public, max-age=31536000, immutable"
  );

  // Generate, upload, and verify each WebP variant
  for (const variant of VARIANTS) {
    const outFile = path.join(workingDir, `${slug}-${stem}${variant.suffix}`);
    await generateWebp(filePath, outFile, variant.maxLongEdge, variant.quality);
    const key = objectKey(slug, stem, variant.suffix);
    await uploadToR2(key, outFile, "image/webp", variant.cacheControl);
    await verifyUrl(publicUrl(key));
    result[variant.field] = publicUrl(key);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Per-album processing
// ---------------------------------------------------------------------------

async function processAlbum(album, workingDir) {
  console.log(`\n── ${album.title} (${album.slug}) ──`);

  // Cover
  console.log(`  cover: ${album.cover.file}`);
  const coverFilePath = localFilePath(album.folder, album.cover.file);
  const coverData = await processImage(album.slug, "cover", coverFilePath, workingDir);

  const albumJson = {
    slug: album.slug,
    title: album.title,
    description: album.description,
    cover: { ...coverData, alt: album.cover.alt },
    items: []
  };

  // Items
  for (let i = 0; i < album.items.length; i++) {
    const item = album.items[i];
    const stem = String(i + 1).padStart(3, "0");
    console.log(`  ${stem}: ${item.file}`);
    const filePath = localFilePath(album.folder, item.file);
    const imageData = await processImage(album.slug, stem, filePath, workingDir);
    albumJson.items.push({ ...imageData, alt: item.alt });
  }

  const outputPath = path.join(PHOTOGRAPHY_DIR, `${album.slug}.json`);
  await writeText(outputPath, `${JSON.stringify(albumJson, null, 2)}\n`);
  console.log(`  ✓ wrote ${path.relative(ROOT, outputPath)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const workingDir = await mkdtemp(path.join(os.tmpdir(), "photo-ingest-"));

  try {
    for (const album of ALBUMS) {
      await processAlbum(album, workingDir);
    }

    console.log("\n✓ All albums ingested successfully.");
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
