import path from "node:path";
import { escapeHtml, escapeAttr } from "./site-shell.mjs";
import { listFiles, readJson } from "./fs-utils.mjs";

const ROOT = process.cwd();
const PHOTOGRAPHY_DIR = path.resolve(ROOT, "content", "photography");

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function imageAspect(image) {
  const width = safeNumber(image?.width);
  const height = safeNumber(image?.height);
  return width && height ? width / height : 1;
}

function renderImage(image, className) {
  const width = safeNumber(image.width);
  const height = safeNumber(image.height);
  const widthAttr = width ? ` width="${width}"` : "";
  const heightAttr = height ? ` height="${height}"` : "";

  return `<img
      alt="${escapeAttr(image.alt ?? "")}"
      class="${className}"
      src="${escapeAttr(image.src)}"${widthAttr}${heightAttr}
      loading="lazy"
      decoding="async"
    >`;
}

function renderLightboxImage(image, index) {
  const alt = escapeAttr(image.alt ?? "");
  const src = escapeAttr(image.src);

  return `
    <button
      class="group relative block w-full cursor-zoom-in text-left transition-transform duration-300 ease-out hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      type="button"
      data-gallery-image-trigger
      data-gallery-image-index="${index}"
      data-gallery-image-src="${src}"
      data-gallery-image-alt="${alt}"
      aria-label="Open image ${index + 1} in larger view"
    >
      <figure class="min-w-0 overflow-hidden rounded-[2px] bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-shadow duration-300 group-hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        ${renderImage(image, "block h-auto w-full")}
      </figure>
      <span
        class="pointer-events-none absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-text-main opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      >
        <span class="material-symbols-outlined text-[1.15rem]">open_in_full</span>
      </span>
    </button>
  `;
}

function inferLabel(album) {
  const title = album.title ?? "";
  const match = title.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "Archive";
}

function renderAlbumFigure(image, className) {
  return `
    <figure class="group overflow-hidden rounded-[2px]">
      ${renderImage(image, className)}
    </figure>
  `;
}

function albumRoute(album) {
  return `/photography/${album.slug}/`;
}

function albumFrameCount(album) {
  const items = Array.isArray(album.items) ? album.items.length : 0;
  return (album.cover?.src ? 1 : 0) + items;
}

function renderAlbumLink(album, content, className = "") {
  return `<a class="${className}" href="${escapeAttr(albumRoute(album))}">${content}</a>`;
}

function normalizedAspect(image) {
  return Math.max(imageAspect(image), 0.45);
}

function partitionJustifiedRows(images, options = {}) {
  const maxPerRow = options.maxPerRow ?? 3;
  const minPerRow = options.minPerRow ?? 2;
  const targetRowAspect = options.targetRowAspect ?? 3.4;

  if (images.length === 0) {
    return [];
  }

  const costs = Array(images.length + 1).fill(Number.POSITIVE_INFINITY);
  const nextBreaks = Array(images.length + 1).fill(images.length);
  costs[images.length] = 0;

  for (let start = images.length - 1; start >= 0; start -= 1) {
    let rowAspect = 0;

    for (let end = start; end < Math.min(images.length, start + maxPerRow); end += 1) {
      const rowSize = end - start + 1;
      const remaining = images.length - (end + 1);
      rowAspect += normalizedAspect(images[end]);

      if (remaining > 0 && remaining < minPerRow) {
        continue;
      }

      const isFinalRow = end === images.length - 1;
      const targetAspect = isFinalRow ? targetRowAspect * 0.9 : targetRowAspect;
      let penalty = Math.pow(rowAspect - targetAspect, 2);

      if (rowSize === 1) {
        penalty += rowAspect < targetRowAspect ? 4 : 1.5;
      }

      if (rowSize === maxPerRow && rowAspect < targetRowAspect * 0.7) {
        penalty += 1.5;
      }

      const totalCost = penalty + costs[end + 1];

      if (totalCost < costs[start]) {
        costs[start] = totalCost;
        nextBreaks[start] = end + 1;
      }
    }
  }

  const rows = [];
  let index = 0;

  while (index < images.length) {
    const nextIndex = nextBreaks[index];

    if (nextIndex <= index || nextIndex > images.length) {
      rows.push(images.slice(index));
      break;
    }

    rows.push(images.slice(index, nextIndex));
    index = nextIndex;
  }

  return rows;
}

function renderJustifiedGallery(images) {
  const rows = partitionJustifiedRows(images);
  let imageIndex = 0;

  const renderedRows = rows.map((rowImages) => {
    const singleImage = rowImages.length === 1;
    const rowClass = singleImage
      ? "flex flex-col gap-6 md:flex-row md:justify-center"
      : "flex flex-col gap-6 md:flex-row md:items-start";

    const figures = rowImages
      .map((image) => {
        const aspect = normalizedAspect(image);
        const currentIndex = imageIndex;
        imageIndex += 1;
        const style = singleImage
          ? ` style="max-width: min(100%, ${Math.max(24, Math.min(44, aspect * 18)).toFixed(2)}rem);"`
          : ` style="flex: ${aspect.toFixed(5)} ${aspect.toFixed(5)} 0%;"`;

        return `
          <div class="min-w-0"${style}>
            ${renderLightboxImage(image, currentIndex)}
          </div>
        `;
      })
      .join("");

  return `
      <div class="${rowClass}">
        ${figures}
      </div>
    `;
  });

  return `
    <div class="space-y-6 md:space-y-8" data-gallery-layout="justified-rows">
      ${renderedRows.join("")}
    </div>
  `;
}

function renderAlbumSequence(album, index) {
  const items = album.items ?? [];
  const patternIndex = index % 3;

  if (patternIndex === 0) {
    return `
      <section class="grid grid-cols-1 gap-8 md:grid-cols-12">
        <figure class="group relative overflow-hidden rounded-[2px] md:col-span-7">
          ${renderAlbumLink(
            album,
            renderImage(album.cover, "h-[32rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"),
            "block"
          )}
          <figcaption class="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/20 to-transparent p-8">
            <div>
              <p class="mb-2 font-label text-[0.7rem] uppercase tracking-[0.24em] text-white/70">
                ${escapeHtml(inferLabel(album))}
              </p>
              <p class="font-headline text-2xl font-bold text-white">${renderAlbumLink(album, escapeHtml(album.title), "transition-opacity hover:opacity-80")}</p>
            </div>
            <p class="font-body text-sm text-white/70">${albumFrameCount(album)} frames</p>
          </figcaption>
        </figure>
        <div class="grid gap-8 md:col-span-5">
          ${items[0] ? renderAlbumFigure(items[0], "h-[15rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]") : ""}
          <div class="px-1 py-2">
            <p class="text-sm leading-7 text-on-surface-variant">${escapeHtml(album.description ?? "")}</p>
            <p class="mt-5">
              ${renderAlbumLink(
                album,
                "Open album",
                "border-b border-primary pb-1 font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary"
              )}
            </p>
          </div>
        </div>
        ${items.slice(1, 4).map((item) => `
          <figure class="group overflow-hidden rounded-[2px] md:col-span-4">
            ${renderImage(item, "h-[26rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]")}
          </figure>
        `).join("")}
        ${items[4] ? `
          <figure class="group overflow-hidden rounded-[2px] md:col-span-5">
            ${renderImage(items[4], "h-[36rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]")}
          </figure>
        ` : ""}
      </section>
    `;
  }

  if (patternIndex === 1) {
    return `
      <section class="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <p class="mb-4 font-label text-[0.72rem] uppercase tracking-[0.22em] text-on-surface-variant">
            ${escapeHtml(inferLabel(album))}
          </p>
          <h3 class="font-headline text-4xl font-bold">${renderAlbumLink(album, escapeHtml(album.title), "transition-opacity hover:opacity-80")}</h3>
          <p class="mt-6 max-w-lg text-base leading-8 text-on-surface-variant">
            ${escapeHtml(album.description ?? "")}
          </p>
          <p class="mt-6">
            ${renderAlbumLink(
              album,
              "Open album",
              "border-b border-primary pb-1 font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary"
            )}
          </p>
        </div>
        <div class="grid gap-8 lg:col-span-8 lg:grid-cols-2">
          ${[album.cover, ...items.slice(0, 3)].filter(Boolean).map((item, itemIndex) =>
            renderAlbumLink(
              album,
              renderAlbumFigure(item, itemIndex === 0 ? "h-[24rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" : "h-[20rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"),
              "block"
            )
          ).join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div class="px-1 py-2">
        <p class="mb-4 font-label text-[0.72rem] uppercase tracking-[0.22em] text-primary">
          ${escapeHtml(inferLabel(album))}
        </p>
        <h3 class="font-headline text-4xl font-bold">${renderAlbumLink(album, escapeHtml(album.title), "transition-opacity hover:opacity-80")}</h3>
        <p class="mt-6 text-base leading-8 text-on-surface-variant">
          ${escapeHtml(album.description ?? "")}
        </p>
        <p class="mt-6">
          ${renderAlbumLink(
            album,
            "Open album",
            "border-b border-primary pb-1 font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary"
          )}
        </p>
      </div>
      <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
        ${[album.cover, ...items.slice(0, 3)].filter(Boolean).map((item, itemIndex) =>
          renderAlbumLink(
            album,
            renderAlbumFigure(
              item,
              itemIndex === 0
                ? "h-[28rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                : "h-[20rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            ),
            "block"
          )
        ).join("")}
      </div>
    </section>
  `;
}

async function loadPhotographyAlbums() {
  const files = await listFiles(PHOTOGRAPHY_DIR, ".json");
  const albums = [];

  for (const filePath of files) {
    const album = await readJson(filePath);

    if (album.slug === "placeholder" || !album.cover?.src || !Array.isArray(album.items)) {
      continue;
    }

    albums.push(album);
  }

  return albums;
}

export async function renderPhotographyIndex() {
  const albums = await loadPhotographyAlbums();

  const featured = albums[0] ?? null;
  const rest = albums.slice(1);

  const intro = `
    <section class="mb-20 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-end">
      <div>
        <p class="mb-5 font-label text-[0.75rem] uppercase tracking-[0.24em] text-on-surface-variant">
          Photography Archive
        </p>
        <h1 class="max-w-4xl font-headline text-[3.5rem] leading-[1.02] font-bold md:text-[4.5rem]">
          Image-led work,
          <span class="font-normal italic">structured by albums</span>
        </h1>
      </div>
      <p class="max-w-xl text-base leading-8 text-on-surface-variant">
        The photography section is rendered from collection JSON. Each album keeps its own
        sequence, cover, and metadata, while the page assembles them into a varied editorial flow.
      </p>
    </section>
  `;

  if (!featured) {
    return `${intro}
      <section class="px-1 py-2">
        <p class="font-headline text-3xl font-bold">No photography albums yet.</p>
        <p class="mt-4 max-w-2xl text-base leading-8 text-on-surface-variant">
          Add collection JSON under <code>content/photography/</code> and the build will render it here.
        </p>
      </section>
    `;
  }

  const sections = [renderAlbumSequence(featured, 0), ...rest.map((album, index) => renderAlbumSequence(album, index + 1))];

  return `
    ${intro}
    <section class="mb-12 flex items-center justify-between gap-6">
      <div>
        <p class="font-label text-[0.72rem] uppercase tracking-[0.22em] text-on-surface-variant">
          Collections
        </p>
        <h2 class="mt-3 font-headline text-3xl font-bold">${albums.length} album${albums.length === 1 ? "" : "s"}</h2>
      </div>
      <p class="max-w-lg text-sm leading-7 text-on-surface-variant">
        Source of truth lives in <span class="font-medium text-text-main">content/photography/*.json</span>.
        The page layout stays consistent in tone but intentionally varies album composition.
      </p>
    </section>
    <div class="space-y-24">
      ${sections.join("\n")}
    </div>
  `;
}

export function renderPhotographyAlbum(album) {
  const images = [album.cover, ...(album.items ?? []).filter(Boolean)];
  const galleryHtml = renderJustifiedGallery(images);

  return `
    <section class="mb-16 flex items-start justify-between gap-8">
      <a
        class="font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary transition-opacity hover:opacity-70"
        href="/photography/"
      >
        Back to Photography
      </a>
      <span class="font-label text-[0.72rem] uppercase tracking-[0.2em] text-on-surface-variant">
        ${albumFrameCount(album)} frames
      </span>
    </section>

    <section class="mb-20 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-end">
      <div>
        <p class="mb-5 font-label text-[0.75rem] uppercase tracking-[0.24em] text-on-surface-variant">
          ${escapeHtml(inferLabel(album))}
        </p>
        <h1 class="max-w-4xl font-headline text-[3.5rem] leading-[1.02] font-bold md:text-[4.75rem]">
          ${escapeHtml(album.title)}
        </h1>
      </div>
      <p class="max-w-xl text-base leading-8 text-on-surface-variant">
        ${escapeHtml(album.description ?? "")}
      </p>
    </section>

    <section class="space-y-8">
      ${galleryHtml}
    </section>

    <section
      class="fixed inset-0 z-[80] hidden items-center justify-center bg-black/84 px-4 py-6 md:px-8"
      hidden
      aria-hidden="true"
      data-gallery-lightbox
    >
      <button
        class="absolute inset-0 cursor-zoom-out"
        type="button"
        aria-label="Close larger image view"
        data-gallery-lightbox-backdrop
      ></button>
      <div class="relative z-10 flex max-h-full w-full max-w-[min(96vw,88rem)] flex-col gap-4">
        <div class="flex items-center justify-between gap-4 text-white">
          <p class="font-label text-[0.72rem] uppercase tracking-[0.24em] text-white/72" data-gallery-lightbox-status></p>
          <div class="flex items-center gap-2">
            <button
              class="inline-flex items-center gap-2 border border-white/18 bg-white/8 px-3 py-2 font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/14"
              type="button"
              data-gallery-lightbox-prev
            >
              <span class="material-symbols-outlined text-[1rem]" aria-hidden="true">arrow_back</span>
              Prev
            </button>
            <button
              class="inline-flex items-center gap-2 border border-white/18 bg-white/8 px-3 py-2 font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/14"
              type="button"
              data-gallery-lightbox-next
            >
              Next
              <span class="material-symbols-outlined text-[1rem]" aria-hidden="true">arrow_forward</span>
            </button>
            <button
              class="inline-flex items-center gap-2 border border-white/18 bg-white/8 px-4 py-2 font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/14"
              type="button"
              data-gallery-lightbox-close
            >
              <span class="material-symbols-outlined text-[1rem]" aria-hidden="true">close</span>
              Close
            </button>
          </div>
        </div>
        <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-auto">
          <img
            class="max-h-[78vh] w-auto max-w-full rounded-[2px] bg-white object-contain shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
            alt=""
            src=""
            decoding="async"
            data-gallery-lightbox-image
          >
        </div>
        <p class="max-w-4xl font-body text-sm leading-7 text-white/84" data-gallery-lightbox-caption></p>
      </div>
    </section>
  `;
}

export async function getGeneratedPages() {
  const albums = await loadPhotographyAlbums();

  return albums.map((album) => ({
    metadata: {
      title: album.title,
      description: album.description,
      path: albumRoute(album),
      section: "photography",
      bodyClass: "page-photography-album",
      ogImage: album.cover?.src ?? ""
    },
    bodyHtml: renderPhotographyAlbum(album)
  }));
}

export async function renderContentSource(source) {
  if (source === "photography-index") {
    return renderPhotographyIndex();
  }

  throw new Error(`Unknown content renderer: ${source}`);
}
