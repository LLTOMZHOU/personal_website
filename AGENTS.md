# AGENTS.md

## Purpose

This repository is a custom static site, not a framework-owned app.

Agents working in this repo should preserve that architecture unless explicitly asked to change it.

## Core Architecture

The site is built from:

- authored page HTML in `pages/`
- metadata sidecars in `pages/*.meta.json`
- bundled client assets in `src/client/`
- bundled styles in `src/styles/`
- optional structured content in `content/`
- a custom build step in `scripts/build-site.mjs`
- a shared shell in `scripts/lib/site-shell.mjs`

Vite is used for asset bundling only.

It is not the routing layer, page framework, or rendering model.

## Source Of Truth

Edit these:

- `pages/**/*.html`
- `pages/**/*.meta.json`
- `src/client/**/*`
- `src/styles/**/*`
- `content/**/*`
- `scripts/**/*`

Do not edit generated output in `dist/`.

If `dist/` looks wrong, fix the source files and rebuild.

## Page Model

Page HTML files are authored content, not full standalone HTML documents.

The build system wraps them with the shared shell so pages do not need to manually include:

- `<html>` and `<body>`
- shared `<head>` metadata structure
- global navigation
- footer
- future analytics wiring when added
- assistant shell
- shared asset links

Keep page content focused on the body of the page.

## Metadata Sidecars

Each page should have a matching `.meta.json` file.

Current expected fields are:

- `title`
- `description`
- `path`
- `section`
- `ogImage`
- `bundles`
- `bodyClass`
- optional `canonicalUrl`
- optional `noIndex`

If a page is missing a metadata sidecar, the build should fail.

## Bundle Model

The global `site` bundle is included automatically on every page.

Optional bundles are declared through page metadata.

Current bundle names include:

- `assistant`
- `gallery`
- `search`
- `motion-home`

Rules:

- keep the global `site` bundle small
- do not pull React into the global bundle
- only add page bundles when a page actually needs them
- prefer lazy loading for heavier interactive features

## React Boundary

React is not the default page model.

If React is used, it should remain isolated to bounded interactive surfaces such as the assistant unless explicitly expanded.

Do not convert ordinary authored pages into React components without a clear reason.

## Content Model

Writing and project pages are authored directly as HTML.

Photography and AI-media are expected to remain JSON-backed.

Treat these as different authoring models:

- editorial pages: authored HTML
- structured media collections: JSON plus templates/build logic

Do not force everything into one content format.

## Media Workflow

The media ingestion workflow is documented in `media-ingestion-workflow.md`.

The intended long-term model is:

- upload media to Cloudflare R2
- verify delivery URLs
- write canonical CDN references into JSON or authored HTML

Avoid inventing ad hoc media URL patterns when working on media features.

## Build And Dev Commands

Use:

- `pnpm build` to produce the static site in `dist/`
- `pnpm dev` for a local rebuild-and-preview loop
- `pnpm preview` to serve `dist/`

If you change page assembly, metadata handling, asset wiring, or bundles, run `pnpm build`.

## Build System Notes

`scripts/build-site.mjs` is the orchestration entry point.

Its responsibilities are:

- clear `dist/`
- run the Vite asset build
- read the Vite manifest
- assemble authored pages into final HTML
- inject the correct hashed asset filenames

If changing routing, metadata injection, or shell behavior, update the custom build system rather than trying to hand-edit built HTML.

## Shared Shell Notes

The shared shell in `scripts/lib/site-shell.mjs` owns:

- repeated document structure
- nav
- footer
- assistant shell
- shared metadata tags
- shared asset includes

If a change affects all pages, it probably belongs in the shared shell.

If a change is unique to one page, it probably belongs in that page's authored HTML or metadata.

## Preferred Editing Behavior

When making changes:

- preserve the static-first architecture
- preserve authored HTML as a first-class source format
- keep global JS light
- avoid introducing SSR, middleware, or framework-specific server assumptions
- avoid editing generated files
- avoid expanding the runtime cost of pages that do not need interactivity

When in doubt, prefer:

- HTML for structure
- CSS for presentation and basic motion
- plain JavaScript for simple enhancement
- isolated bundles for heavier interactions

## PR Review Replies

When addressing PR review comments:

- only reply after the fix is actually implemented
- reply `done` for straightforward fixes
- reply `good point, done` when the review caught something genuinely useful
- when replying `good point, done`, resolve the thread if the fix is complete and the thread is actionable
- if the right action is ambiguous or needs product judgment, leave the thread for the user instead of guessing
