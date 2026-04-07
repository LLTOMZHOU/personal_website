# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
SITE_URL=http://127.0.0.1:4173 pnpm build   # build static site into dist/
pnpm dev                                      # rebuild-and-preview loop
pnpm preview                                  # serve dist/ locally
pnpm lint:repo                                # validate page/metadata invariants
pnpm test:smoke                               # run smoke tests (triggers a build)
pnpm test                                     # lint:repo + test:smoke
pnpm typecheck                                # tsc --noEmit
pnpm format                                   # prettier -w .
```

`pnpm build` requires `SITE_URL` to be set (used for canonical URLs and OG metadata). For production, set it to the deployed origin.

## Architecture

This is a custom static site — **not a framework app**. Vite is used for asset bundling only; it is not the router, renderer, or page model.

### Build pipeline

`scripts/build-site.mjs` orchestrates the build:

1. Clears `dist/`
2. Runs `vite build` to hash and bundle client assets, producing a Vite manifest
3. For each page in `pages/*.html`, reads its `.meta.json` sidecar and wraps the body HTML with the shared shell (`scripts/lib/site-shell.mjs`)
4. Also generates pages from structured content (e.g., photography albums from `content/photography/*.json`) via `scripts/lib/content-renderers.mjs`
5. Writes all final HTML into `dist/`

### Page model

- `pages/*.html` — authored body HTML fragments (not full documents — no `<html>`, `<head>`, `<body>`)
- `pages/*.meta.json` — required sidecar per page with fields: `title`, `description`, `path`, `section`, `ogImage`, `bundles`, `bodyClass`; optional: `contentRenderer`, `canonicalUrl`, `noIndex`
- If `contentRenderer` is set, the page's body is generated at build time from structured content rather than from the `.html` file

### Client bundles

- `src/client/site.ts` — global bundle, included on every page (nav, assistant toggle, lightbox, etc.); keep this small
- `src/client/assistant/` — lazy-loaded assistant bundle, also included on every page but loaded on demand
- Other bundles (`gallery.ts`, `search.ts`, `motion-home.ts`) — declared per-page in `bundles` metadata array

Tailwind CSS v4 is used via `@tailwindcss/vite`. Styles live in `src/styles/global.css`.

### Content model

- Editorial pages (projects, writing): authored directly as HTML in `pages/`
- Structured media (photography, AI-media): JSON in `content/` rendered by build-time templates in `scripts/lib/content-renderers.mjs`

Photography albums: each `content/photography/<slug>.json` file becomes a generated album page at `/photography/<slug>/`. `placeholder.json` files are ignored by the build.

### Media delivery

Images are hosted on an external CDN (Cloudflare R2 / `media.yuxingzhou.me`). Each image entry in album JSON has `src` (full-resolution), `display` (medium for inline grid), and `thumb` (small for previews). The ingestion workflow is documented in `docs/media-ingestion-workflow.md` and `skills/photo-ingestion-upload-serve/SKILL.md`.

### Shared shell

`scripts/lib/site-shell.mjs` owns the document structure, nav, footer, assistant shell, and all shared `<head>` tags. Changes that affect all pages belong here.

### Linting

`pnpm lint:repo` (`scripts/lint-repo.mjs`) enforces:
- every `.html` page has a matching `.meta.json`
- metadata has all required keys and no unknown keys
- `section` is one of the allowed values
- `bundles` references only known client entry points
- page HTML does not include `<html>`, `<body>`, `<head>`, or `<!doctype>`
- no references to `dist/` paths in source pages

### Git hooks

`.githooks/` (registered via `core.hooksPath`):
- `pre-commit`: runs `lint:repo` + `test:smoke`
- `pre-push`: runs `pnpm build` with a default `SITE_URL` if unset

### Deployment

GitHub Actions builds with `pnpm build` and deploys `dist/` to Cloudflare Pages via `wrangler pages deploy`. See `README.md` for required repository variables and secrets.

## Key conventions

- Do not edit `dist/` — fix source files and rebuild
- React is restricted to the assistant panel; do not introduce it to authored pages
- Keep the global `site` bundle lean — isolate heavier interactions to page-specific bundles
- When adding a new page: create both the `.html` fragment and a `.meta.json` sidecar; run `pnpm lint:repo` to validate
- Photography album JSON files with `slug: "placeholder"` or missing required fields are silently skipped at build time
- See `AGENTS.md` for PR workflow, git workflow, and preferred editing conventions
