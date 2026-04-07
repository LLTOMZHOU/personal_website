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
