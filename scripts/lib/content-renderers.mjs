import path from "node:path";
import { escapeHtml, escapeAttr } from "./site-shell.mjs";
import { fileExists, listFiles, readJson } from "./fs-utils.mjs";

const ROOT = process.cwd();
const PHOTOGRAPHY_DIR = path.resolve(ROOT, "content", "photography");
export const CONTENT_RENDERERS = Object.freeze({
  PHOTOGRAPHY_INDEX: "photography-index"
});

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function imageAspect(image) {
  const width = safeNumber(image?.width);
  const height = safeNumber(image?.height);
  return width && height ? width / height : 1;
}

function displayImage(image) {
  if (!image || typeof image !== "object") {
    return image;
  }

  if (typeof image.display === "string" && image.display.trim() !== "") {
    return {
      ...image,
      src: image.display.trim()
    };
  }

  if (typeof image.thumb === "string" && image.thumb.trim() !== "") {
    return {
      ...image,
      src: image.thumb.trim()
    };
  }

  return image;
}

function renderImage(image, className, loading = "lazy") {
  const width = safeNumber(image.width);
  const height = safeNumber(image.height);
  const widthAttr = width ? ` width="${width}"` : "";
  const heightAttr = height ? ` height="${height}"` : "";
  const normalizedLoading = loading === "eager" || loading === "auto" ? loading : "lazy";

  return `<img
      alt="${escapeAttr(image.alt ?? "")}"
      class="${className}"
      src="${escapeAttr(image.src)}"${widthAttr}${heightAttr}
      loading="${normalizedLoading}"
      decoding="async"
    >`;
}

function renderLightboxImage(image, index, loading = "lazy") {
  const alt = escapeAttr(image.alt ?? "");
  const lightboxSrc = escapeAttr(image.src);
  const inlineImage = displayImage(image);
  const inlineSrc = escapeAttr(inlineImage.src);

  return `
    <button
      class="group relative block w-full cursor-zoom-in text-left transition-transform duration-300 ease-out hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      type="button"
      data-gallery-image-trigger
      data-gallery-image-index="${index}"
      data-gallery-image-src="${lightboxSrc}"
      data-gallery-image-preview-src="${inlineSrc}"
      data-gallery-image-alt="${alt}"
      aria-label="Open image ${index + 1} in larger view"
    >
      <figure class="min-w-0 overflow-hidden rounded-[2px] bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-shadow duration-300 group-hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        ${renderImage(inlineImage, "block h-auto w-full", loading)}
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

function previewImage(image) {
  if (!image?.thumb) {
    return image;
  }

  return {
    ...image,
    src: image.thumb
  };
}

function albumPreviewImages(album) {
  const items = (album.items ?? []).filter(Boolean);
  const configuredPreviewIndices = Array.isArray(album.indexPreviewItems)
    ? album.indexPreviewItems.filter((value) => Number.isInteger(value) && value >= 0 && value < items.length)
    : [];

  const previewItems =
    configuredPreviewIndices.length > 0
      ? configuredPreviewIndices.map((index) => items[index]).filter(Boolean)
      : items.slice(0, 3);

  return [album.cover, ...previewItems].filter(Boolean).slice(0, 4).map(previewImage);
}

function inferLabel(album) {
  const title = album.title ?? "";
  const match = title.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "Archive";
}

function renderAlbumFigure(image, className, loading = "lazy") {
  return `
    <figure class="group overflow-hidden rounded-[2px]">
      ${renderImage(image, className, loading)}
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
  const minPerRow = options.minPerRow ?? 1;
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
        // Portrait images (aspect < 0.85) look intentional alone — don't penalize them.
        // Landscape singles still get penalized to encourage grouping.
        if (rowAspect >= 0.85) {
          penalty += rowAspect < targetRowAspect ? 4 : 1.5;
        }
      }

      if (rowSize === maxPerRow && rowAspect < targetRowAspect * 0.7) {
        penalty += 1.5;
      }

      // Discourage mixing portrait images (aspect < 0.85) with landscape images
      // (aspect > 1.1) in the same row — the portrait gets squeezed unacceptably.
      if (rowSize > 1) {
        const rowSlice = images.slice(start, end + 1);
        const hasPortrait = rowSlice.some(img => normalizedAspect(img) < 0.85);
        const hasLandscape = rowSlice.some(img => normalizedAspect(img) > 1.1);
        if (hasPortrait && hasLandscape) {
          penalty += 12;
        }
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
        const loading = currentIndex === 0 ? "eager" : "lazy";
        const style = singleImage
          ? ` style="max-width: min(100%, ${Math.max(24, Math.min(44, aspect * 18)).toFixed(2)}rem);"`
          : ` style="flex: ${aspect.toFixed(5)} ${aspect.toFixed(5)} 0%;"`;

        return `
          <div class="min-w-0"${style}>
            ${renderLightboxImage(image, currentIndex, loading)}
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
  const previewImages = albumPreviewImages(album);
  const configuredPatternIndex = Number.isInteger(album.indexPattern) ? album.indexPattern : null;
  const patternIndex =
    configuredPatternIndex !== null && configuredPatternIndex >= 0
      ? configuredPatternIndex % 3
      : index % 3;
  const coverLoading = index === 0 ? "eager" : "lazy";

  if (patternIndex === 0) {
    return `
      <section class="grid grid-cols-1 gap-6 md:grid-cols-12">
        <figure class="group relative overflow-hidden rounded-[2px] md:col-span-7">
          ${renderAlbumLink(
            album,
            renderImage(previewImages[0], "h-[23rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] md:h-[25rem]", coverLoading),
            "block"
          )}
          <figcaption class="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/20 to-transparent p-6">
            <div>
              <p class="mb-2 font-label text-[0.7rem] uppercase tracking-[0.24em] text-white/70">
                ${escapeHtml(inferLabel(album))}
              </p>
              <p class="font-headline text-2xl font-bold text-white">${renderAlbumLink(album, escapeHtml(album.title), "transition-opacity hover:opacity-80")}</p>
            </div>
            <p class="font-body text-sm text-white/70">${albumFrameCount(album)} frames</p>
          </figcaption>
        </figure>
        <div class="grid gap-6 md:col-span-5">
          ${previewImages[1]
            ? renderAlbumLink(album, renderAlbumFigure(previewImages[1], "h-[11rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[13rem]"), "block")
            : ""}
          <div class="px-1 py-2">
            <p class="text-base leading-6 text-on-surface-variant">${escapeHtml(album.description ?? "")}</p>
            <p class="mt-5">
              ${renderAlbumLink(
                album,
                "Open album",
                "border-b border-primary pb-1 font-body text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary"
              )}
            </p>
          </div>
        </div>
        ${previewImages.slice(2, 4).map((item) =>
          renderAlbumLink(
            album,
            `<figure class="group overflow-hidden rounded-[2px]">
              ${renderImage(item, "h-[14rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[16rem]")}
            </figure>`,
            "block md:col-span-4"
          )
        ).join("")}
      </section>
    `;
  }

  if (patternIndex === 1) {
    return `
      <section class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <p class="mb-4 font-label text-[0.72rem] uppercase tracking-[0.22em] text-on-surface-variant">
            ${escapeHtml(inferLabel(album))}
          </p>
          <h3 class="font-headline text-4xl font-bold">${renderAlbumLink(album, escapeHtml(album.title), "transition-opacity hover:opacity-80")}</h3>
          <p class="mt-6 max-w-lg text-base leading-6 text-on-surface-variant">
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
        <div class="grid gap-6 lg:col-span-8 lg:grid-cols-2">
          ${previewImages.map((item, itemIndex) =>
            renderAlbumLink(
              album,
              renderAlbumFigure(
                item,
                itemIndex === 0
                  ? "h-[19rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[21rem]"
                  : "h-[14rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[16rem]"
              ),
              "block"
            )
          ).join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div class="px-1 py-2">
        <p class="mb-4 font-label text-[0.72rem] uppercase tracking-[0.22em] text-primary">
          ${escapeHtml(inferLabel(album))}
        </p>
        <h3 class="font-headline text-4xl font-bold">${renderAlbumLink(album, escapeHtml(album.title), "transition-opacity hover:opacity-80")}</h3>
        <p class="mt-6 text-base leading-6 text-on-surface-variant">
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
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        ${previewImages.map((item, itemIndex) =>
          renderAlbumLink(
            album,
            renderAlbumFigure(
              item,
              itemIndex === 0
                ? "h-[19rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[21rem]"
                : "h-[14rem] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[16rem]"
            ),
            "block"
          )
        ).join("")}
      </div>
    </section>
  `;
}

async function loadPhotographyAlbums() {
  if (!(await fileExists(PHOTOGRAPHY_DIR))) {
    return [];
  }

  const files = await listFiles(PHOTOGRAPHY_DIR, ".json");
  const albums = [];

  for (const filePath of files) {
    const album = await readJson(filePath);
    const slug = typeof album.slug === "string" ? album.slug.trim() : "";
    const title = typeof album.title === "string" ? album.title.trim() : "";
    const description = typeof album.description === "string" ? album.description.trim() : "";
    const coverSrc = typeof album.cover?.src === "string" ? album.cover.src.trim() : "";
    const items = Array.isArray(album.items)
      ? album.items.filter(
          (item) => item && typeof item === "object" && typeof item.src === "string" && item.src.trim() !== ""
        )
      : null;

    if (slug === "" || slug === "placeholder" || title === "" || coverSrc === "" || items === null) {
      continue;
    }

    albums.push({
      ...album,
      slug,
      title,
      description,
      cover: {
        ...album.cover,
        src: coverSrc
      },
      items
    });
  }

  return albums;
}

export async function renderPhotographyIndex() {
  const albums = await loadPhotographyAlbums();

  const featured = albums[0] ?? null;
  const rest = albums.slice(1);

  const intro = `
    <section class="mb-12 flex items-end justify-between gap-8">
      <div>
        <p class="mb-4 font-label text-[0.75rem] uppercase tracking-[0.24em] text-on-surface-variant">
          Photography
        </p>
        <h1 class="font-headline text-[3rem] leading-[1.05] font-bold md:text-[3.75rem]">
          Studies in light and form
        </h1>
      </div>
      <div class="shrink-0 text-right">
        <p class="font-label text-[0.72rem] uppercase tracking-[0.22em] text-on-surface-variant">
          Collections
        </p>
        <p class="mt-2 font-headline text-xl font-bold">${albums.length} album${albums.length === 1 ? "" : "s"}</p>
      </div>
    </section>
  `;

  if (!featured) {
    return `${intro}
      <section class="px-1 py-2">
        <p class="font-headline text-3xl font-bold">No photography albums yet.</p>
        <p class="mt-4 max-w-2xl text-base leading-6 text-on-surface-variant">
          Add collection JSON under <code>content/photography/</code> and the build will render it here.
        </p>
      </section>
    `;
  }

  const sections = [renderAlbumSequence(featured, 0), ...rest.map((album, index) => renderAlbumSequence(album, index + 1))];

  return `
    ${intro}
    <div class="space-y-16 md:space-y-20">
      ${sections.join("\n")}
    </div>
  `;
}

export function renderPhotographyAlbum(album) {
  const images = [album.cover, ...(album.items ?? []).filter(Boolean)];
  const galleryHtml = renderJustifiedGallery(images);

  return `
    <section class="mb-8 flex items-start justify-between gap-8">
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

    <section class="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-end">
      <div>
        <p class="mb-5 font-label text-[0.75rem] uppercase tracking-[0.24em] text-on-surface-variant">
          ${escapeHtml(inferLabel(album))}
        </p>
        <h1 class="max-w-4xl font-headline text-[3.5rem] leading-[1.02] font-bold md:text-[4.75rem]">
          ${escapeHtml(album.title)}
        </h1>
      </div>
      <p class="max-w-xl text-base leading-6 text-on-surface-variant">
        ${escapeHtml(album.description ?? "")}
      </p>
    </section>

    <section class="space-y-8">
      ${galleryHtml}
    </section>

    <section
      class="fixed inset-0 z-[80] hidden items-center justify-center bg-black/84 px-4 py-3 md:px-8"
      hidden
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
      aria-labelledby="gallery-lightbox-title"
      aria-describedby="gallery-lightbox-status gallery-lightbox-caption"
      data-gallery-lightbox
    >
      <button
        class="absolute inset-0 cursor-zoom-out"
        type="button"
        aria-label="Close larger image view"
        data-gallery-lightbox-backdrop
      ></button>
      <div class="relative z-10 flex max-h-full w-full max-w-[min(96vw,88rem)] flex-col gap-4">
        <h2 class="sr-only" id="gallery-lightbox-title">Image viewer</h2>
        <div class="flex items-center justify-between gap-4 text-white">
          <p
            class="font-label text-[0.72rem] uppercase tracking-[0.24em] text-white/72"
            id="gallery-lightbox-status"
            data-gallery-lightbox-status
          ></p>
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
            class="max-h-[84vh] w-auto max-w-full rounded-[6px] bg-black/20 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.34)] transition-opacity duration-150"
            alt=""
            decoding="async"
            data-gallery-lightbox-image
          >
        </div>
        <p
          class="max-w-4xl font-body text-sm leading-7 text-white/84"
          id="gallery-lightbox-caption"
          data-gallery-lightbox-caption
        ></p>
      </div>
    </section>
  `;
}

export async function getGeneratedPages() {
  const albums = await loadPhotographyAlbums();

  return albums.map((album) => ({
    metadata: {
      title: typeof album.title === "string" && album.title.trim() ? album.title : "Photography Album",
      description:
        typeof album.description === "string" && album.description.trim()
          ? album.description
          : "Photography collection by Yuxing Zhou.",
      path: albumRoute(album),
      section: "photography",
      bundles: ["gallery"],
      bodyClass: "page-photography-album",
      ogImage: album.cover?.src ?? ""
    },
    bodyHtml: renderPhotographyAlbum(album)
  }));
}

export async function renderContentSource(source) {
  if (source === CONTENT_RENDERERS.PHOTOGRAPHY_INDEX) {
    return renderPhotographyIndex();
  }

  throw new Error(`Unknown content renderer: ${source}`);
}
