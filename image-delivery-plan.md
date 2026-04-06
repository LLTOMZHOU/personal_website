# Image Delivery Plan

## Purpose

Capture the image-handling features we want from a static custom pipeline, including the useful parts people often rely on `next/image` for.

## Desired Functionality

The image system should eventually provide:

- optimized image formats such as `WebP` and `AVIF`
- responsive derivatives at multiple widths
- plain `<img>` output with `srcset` and `sizes`
- explicit `width` and `height` metadata where practical
- `loading="lazy"` for below-the-fold images
- eager loading or `fetchpriority="high"` for important above-the-fold images
- `decoding="async"` by default for non-critical images
- optional tiny placeholders or blur previews later if useful
- stable CDN delivery through Cloudflare R2

## Notes

`WebP` and `AVIF` are modern image formats that are usually much smaller than PNG or JPEG for web delivery.

For this site:

- use modern formats for photography and editorial images where possible
- avoid large remote PNGs as a long-term solution
- keep only a small number of images eager on initial page load
- lazy-load images that are offscreen or far below the fold

## Implementation Direction

This should be implemented in the media ingestion and build pipeline, not through a framework runtime.

The intended flow is:

1. ingest source images
2. generate optimized variants
3. upload variants to R2
4. store canonical URLs and image metadata
5. render plain HTML `<img>` tags with the right attributes

## Target HTML Output

Typical image output should eventually look like:

```html
<img
  src="https://media.example.com/projects/foo/cover-1600.avif"
  srcset="
    https://media.example.com/projects/foo/cover-800.avif 800w,
    https://media.example.com/projects/foo/cover-1200.avif 1200w,
    https://media.example.com/projects/foo/cover-1600.avif 1600w
  "
  sizes="(min-width: 1024px) 60vw, 100vw"
  width="1600"
  height="900"
  loading="lazy"
  decoding="async"
  alt="..."
>
```

## Later Tasks

When we implement this, we should decide:

- standard derivative widths
- when to use AVIF versus WebP
- which images on each page are eager versus lazy
- whether to generate blur placeholders
- how image metadata is stored for authored HTML pages versus JSON-backed collections
