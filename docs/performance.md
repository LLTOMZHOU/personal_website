> **Historical observation log — not actively maintained.**
> Point-in-time production measurements. Kept for reference; do not treat as current state.

# Performance Notes

## Production caching check for photography

Checked on April 7, 2026 against production:

- `https://yuxingzhou.me/photography/`
- `https://yuxingzhou.me/photography/laguna-beach-july-2023/`
- `https://yuxingzhou.me/photography/los-angeles/`
- `https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover.jpg`
- `https://media.yuxingzhou.me/photography/laguna-beach-july-2023/001@thumb.jpg`
- `https://media.yuxingzhou.me/photography/los-angeles/cover@thumb.jpg`

### Result

The photography page HTML is not currently edge cached by Cloudflare.

Observed on page documents:

- `cf-cache-status: DYNAMIC`
- `cache-control: public, max-age=0, must-revalidate`
- `server: cloudflare`
- `cf-ray: ...-SJC`

This means the requests are going through Cloudflare, but Cloudflare is not serving a reusable edge-cached HTML response for these routes.

The photography images on `media.yuxingzhou.me` are cached well and are being served through Cloudflare's CDN.

Observed on image responses:

- `cf-cache-status: HIT`
- `server: cloudflare`
- `cf-ray: ...-SJC`
- long-lived cache headers such as:
  - `cache-control: public, max-age=31536000, immutable`
  - `cache-control: max-age=14400`

This confirms the media host is proxied by Cloudflare and image bytes are being served from edge cache rather than fetched from origin on every request.

### Current interpretation

The HTML behavior appears to come from Cloudflare Pages default document caching rather than an explicit header configuration in this repo.

Supporting repo findings:

- the site deploys `dist/` to Cloudflare Pages through `.github/workflows/deploy-cloudflare-pages.yml`
- there is no `_headers` file in the repo
- there is no `wrangler.toml` or equivalent repo-level response header configuration
- there is no code in the site build that sets `Cache-Control` for HTML responses

### Summary

- HTML under `yuxingzhou.me/photography/` is not edge cached today
- images under `media.yuxingzhou.me/photography/` are edge cached and CDN-served
- the image delivery path is in good shape
- the HTML caching policy would need to be changed separately if we want edge-cached documents

## Photography delivery update

Checked on April 7, 2026 after the photography asset migration.

### Delivery model

Photography assets now use explicit WebP delivery tiers:

- `@full.webp` for the larger lightbox view
- `@display.webp` for inline album-page rendering
- `@thumb.webp` for index and preview surfaces

Photography JSON now records:

- `src` as the `@full.webp` asset
- `display` as the `@display.webp` asset
- `thumb` as the `@thumb.webp` asset
- `originalSrc` as the preserved source JPEG URL used for provenance and derivative reruns

### Live CDN check

Sample live responses on `media.yuxingzhou.me`:

- `https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover@full.webp`
- `https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover@display.webp`
- `https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover@thumb.webp`

Observed on those responses:

- `content-type: image/webp`
- `cache-control: public, max-age=31536000, immutable`
- `server: cloudflare`
- `cf-cache-status: HIT`

This confirms the new WebP tiers are live, cacheable, and being served from Cloudflare edge cache.

### Loading strategy

The photography album page now uses a tiered loading strategy:

- initial inline rendering uses `@display.webp`
- the lightbox uses `@full.webp`
- the client warms the first full-size image after page idle
- opening a lightbox image triggers adjacent full-size prefetch for smoother next/previous navigation

Observed on local DevTools inspection of `/photography/laguna-beach-july-2023/`:

- initial network image requests were `cover@display.webp`, `001@display.webp`, `002@display.webp`, `003@display.webp`, `004@display.webp`, and `005@display.webp`
- `cover@full.webp` was fetched separately as the idle warmup path
- opening image 2 loaded `001@full.webp` into the lightbox
- the next adjacent full-size image `002@full.webp` was prefetched after lightbox open

### Current interpretation

The photography delivery path is now in a materially better place than the earlier JPEG/original-heavy model:

- album pages no longer render full-size originals inline
- preview and display tiers are explicitly modeled rather than inferred
- full-size assets remain available for enlarged viewing without forcing that cost onto the initial page render

The remaining HTML document caching observation above is still unchanged:

- page HTML is dynamic at the Cloudflare edge
- image/media delivery is strongly cached and CDN-served
