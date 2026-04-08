# Photo Ingestion Upload And Serve

## Purpose

Use this skill when ingesting photography or other visual media from a local folder into the site.

This workflow is intentionally AI-first, not script-first.

The source folders may arrive in inconsistent shapes, naming schemes, or levels of completeness. The goal is not to force every intake through a rigid parser. The goal is to produce a repeatable, defensible workflow that:

- inspects local media safely
- infers a useful structure from messy inputs
- asks only the minimum clarifying questions
- uploads to the canonical media backend
- verifies delivery
- writes the resulting references into the repo

This skill should describe the current operational reality of the repo, not an imaginary future pipeline.

## Current Repo Reality

As currently implemented:

- canonical media bucket: `yuxingzhou-media`
- canonical media domain: `https://media.yuxingzhou.me`
- photography albums live in `content/photography/*.json`
- the photography landing page is generated via `pages/photography.meta.json` with `contentRenderer: "photography-index"`
- album detail pages are generated at `/photography/<slug>/` by `scripts/lib/content-renderers.mjs`
- uploads currently happen through a locally authenticated `wrangler` CLI flow
- `wrangler` is not installed as a repo dependency; uploads use `npx wrangler` from `/tmp` with an explicit Node 20 PATH prefix to avoid the repo-local Node version conflict
- `scripts/ingest-photography.mjs` is the primary ingestion tool — add album configs and run it for new albums or full replacements
- `scripts/rethumb-photography.mjs` re-uploads only the `@thumb.webp` variant for all albums from local source files (use when thumb quality settings change)
- `scripts/migrate-photography-webp.mjs` was a one-off migration script for re-deriving WebP from already-uploaded JPEGs; no longer the primary tool
- photography JSON now supports `src`, `display`, `thumb`, and `originalSrc` fields for image assets
- album detail pages render `display` assets inline and reserve `src` for the larger lightbox view
- the current proven derivative pattern is WebP tiering with adjacent object keys such as `cover@full.webp`, `cover@display.webp`, and `cover@thumb.webp`
- `originalSrc` preserves the source JPEG URL so later derivative reruns do not lose provenance

Be explicit about those facts when operating this skill.

## When To Use It

Use this skill for:

- photography album ingestion
- AI-media collection ingestion
- image-led project galleries
- editorial image uploads for pages in `pages/`
- shared site imagery such as heroes, thumbnails, or portraits

Do not use this skill for:

- ordinary text-only page edits
- ad hoc experimentation that should not affect the site
- fully automated bulk ingestion where the user explicitly wants a separate one-off script

## Core Principles

- Treat local folders as source material, not as already-valid structured data.
- Prefer inspection, inference, and confirmation over hard-coded assumptions.
- Avoid writing brittle parsing scripts just to handle one folder shape.
- Preserve stable object-key conventions so reruns remain understandable.
- Keep the site runtime static. Ingestion happens before deploy, not at request time.
- Use Cloudflare R2 as the canonical upload target unless the user explicitly changes the storage decision.
- Store canonical delivery URLs in repo-managed JSON or authored HTML, never temporary local file paths.

## Inputs

The user may provide:

- a local folder path
- a target section such as `photography`, `ai-media`, `projects`, `writing`, or `site`
- a title, slug, or collection name
- optional editorial context
- optional preferred cover image
- optional ordering guidance

The folder may be outside the repo.

Example shapes:

- one folder containing a single album
- one parent folder containing several album folders
- mixed image and video assets
- messy filenames from phone exports
- a curated set with manually named files

## Required Output

A successful run should leave behind:

- uploaded media in the canonical bucket/path layout
- verified public delivery URLs
- updated repo content pointing at those canonical URLs
- enough metadata for future agents to understand what was ingested

Depending on the media type, that means:

- `content/photography/*.json`
- `content/ai-media/*.json`
- authored HTML under `pages/**/*.html`
- related metadata sidecars if needed

For a normal photography album ingest in the current repo, the expected output is:

- uploaded assets under `https://media.yuxingzhou.me/photography/<slug>/`
- one JSON file at `content/photography/<slug>.json`
- a generated landing-page card on `/photography/`
- a generated album page at `/photography/<slug>/`

For a normal photography run, “done” means all of the following are true:

- upload credentials and bucket access were confirmed before final repo writes
- public delivery URLs were verified after upload
- repo content points only at verified canonical URLs
- `/photography/` and `/photography/<slug>/` were checked after the build

Do not treat “JSON was written” as success if the upload path or delivery verification is still broken.

When derivatives are created for photography, the expected output also includes:

- preview assets under `https://media.yuxingzhou.me/photography/<slug>/*@thumb.webp`
- display assets under `https://media.yuxingzhou.me/photography/<slug>/*@display.webp`
- full-size lightbox assets under `https://media.yuxingzhou.me/photography/<slug>/*@full.webp`
- `thumb`, `display`, and `src` fields in the photography JSON for the cover and gallery items

## Operating Flow

### 1. Environment Preflight

Before inspecting or uploading, confirm the operational path is usable.

Check at least:

- `node -v`
- `npx wrangler --version`
- `wrangler whoami`
- that the target bucket exists
- that a remote `wrangler` R2 operation is possible from the current machine

If the repo cwd has a toolchain conflict, such as a shadowed `node` binary or an `npx`/Node mismatch, prefer a neutral working directory such as `/tmp` and use absolute file paths for upload commands.

Do not install random new tooling in the middle of ingestion just to get around a local environment issue.

### 2. Inspect First

Start read-only.

Inspect the provided folder and summarize:

- file count
- extensions and media types
- subfolder structure
- obvious unsupported assets
- candidate cover images
- likely sequence order
- anything unusual or risky

If dimensions or file sizes are easy to inspect, include them.

Do not upload or rewrite content before this summary exists.

### 3. Infer The Intended Shape

Use judgment to determine what the folder most likely represents:

- one photography album
- multiple albums
- one editorial image set for a page
- one project gallery
- a mixed or ambiguous collection requiring clarification

Infer a proposed mapping before asking questions.

Good AI behavior here means presenting a probable interpretation, not dumping raw filesystem output and stopping.

### 4. Ask Only The Minimum Clarifying Questions

Only ask when the answer materially affects storage keys, page placement, or authored metadata.

Typical questions, if needed:

- Is this one album or several?
- Which item should be the cover?
- Should this live under `photography`, `ai-media`, `projects`, `writing`, or `site`?
- What title or slug should be canonical?
- Is the current file order intentional?

If the answers are obvious enough, proceed and state the assumptions.

### 5. Normalize Without Losing Meaning

Normalize the ingest plan, not necessarily the original source folder.

Prefer deterministic object keys such as:

- `photography/<slug>/cover@full.webp`
- `photography/<slug>/cover@display.webp`
- `photography/<slug>/cover@thumb.webp`
- `photography/<slug>/001@full.webp`
- `photography/<slug>/001@display.webp`
- `photography/<slug>/001@thumb.webp`
- `projects/<slug>/cover.webp`
- `writing/<slug>/figure-01.webp`
- `site/shared/<name>.webp`

Rules:

- use lowercase slugs
- avoid spaces
- prefer stable numbering for gallery items
- keep cover assets explicit
- avoid object keys that depend on temporary local folder names unless those names are already canonical

For messy source folders:

- normalize folder names aggressively for slugs
- preserve human-facing title decisions separately from slug normalization
- trim trailing spaces and other filesystem noise
- fix obvious place-name singular/plural issues in titles when confidence is high
- if date information is missing, it is acceptable to ship a date-less title and slug rather than inventing one

### 6. Use AI For Semantics, Not For Guessing Randomly

AI should help with:

- classifying the collection shape
- generating first-pass titles or descriptions from folder context
- proposing alt text drafts
- detecting weak naming
- identifying likely hero or cover images

AI should not silently invent critical metadata when confidence is low.

If confidence is low on something user-facing, surface the uncertainty.

### 7. Prepare Delivery Assets

Derivative generation is allowed, but it is not the defining step of the workflow.

When preparing assets:

- consider modern delivery formats such as `AVIF` or `WebP` when the workflow has a real derivative step
- keep originals locally if that is operationally useful
- create thumbnails or smaller derivatives when the target surface needs them
- preserve enough metadata to emit width, height, and alt text later

Do not block the workflow on perfect optimization if the main need is to get a clean, canonical media path into the site.

Current repo note:

- the working photography path now generates WebP derivatives and records `width`, `height`, `alt`, `originalSrc`, `src`, `display`, and `thumb` in JSON
- `src` should point at `@full.webp` — full resolution, quality 92
- `display` should point at `@display.webp` — max long edge 1800px, quality 86, used inline on album pages
- `thumb` should point at `@thumb.webp` — max long edge 1080px, quality 85, used on the photography index and preview surfaces
- `originalSrc` should remain the stable source JPEG URL unless the repo deliberately changes its provenance model
- unless the user explicitly wants a different format strategy, treat WebP tiering as the current default photography delivery path
- the canonical settings live in `scripts/ingest-photography.mjs` in the `VARIANTS` array; use `scripts/rethumb-photography.mjs` to re-upload only thumbs if quality settings change

### 8. Upload To Canonical Storage

Upload to Cloudflare R2 using deterministic keys.

Current canonical target:

- bucket: `yuxingzhou-media`
- public domain: `https://media.yuxingzhou.me`

Current working operational path:

- authenticate `wrangler` locally on the machine being used
- use Wrangler to upload objects to R2
- do not assume there is a repo-local `wrangler` package or checked-in upload script

If the machine still has an `npx`/Node mismatch, use the already-working local Wrangler path rather than installing random new tooling mid-ingest.

Operational fallback order:

- first try the normal local `wrangler` path
- if the repo cwd injects conflicting binaries, run from a neutral directory
- use absolute source file paths when operating outside the repo
- only proceed to repo writes after the upload path is proven to work

Real key examples:

- `photography/laguna-beach-july-2023/cover@full.webp`
- `photography/laguna-beach-july-2023/cover@display.webp`
- `photography/laguna-beach-july-2023/cover@thumb.webp`
- `photography/laguna-beach-july-2023/001@full.webp`
- `photography/laguna-beach-july-2023/001@display.webp`
- `photography/laguna-beach-july-2023/001@thumb.webp`

Avoid:

- ad hoc bucket paths
- inconsistent prefixes
- one-off naming conventions for a single import

If rerunning an ingestion, favor predictability over novelty. The user should be able to infer where the object landed.

### 9. Verify Delivery

After upload, verify the public URLs.

Check:

- the URLs resolve successfully
- expected content types are served
- obvious missing objects or broken paths are caught before repo content is updated

Do not write final canonical URLs into the repo until delivery verification passes or the failure is explicitly acknowledged.

If upload verification fails, stop before writing final canonical URLs unless the user explicitly asks for a partial or placeholder repo update.

### 10. Write Repo References

Write canonical URLs into the appropriate repo source.

For structured media:

- update or create JSON in `content/photography/` or `content/ai-media/`

For editorial media:

- update authored HTML under `pages/`

Do not store local absolute filesystem paths in repo content.

Current photography rule:

- the album source of truth is JSON
- the landing page is renderer-driven
- the album page is generated from shared build logic
- do not hand-author a normal album page under `pages/photography/`

### 11. Validate The Site

After content updates:

- run the site build with `SITE_URL` set
- confirm the affected page renders correctly
- check for broken references introduced by the ingestion

For photography albums, verify at least:

- `/photography/`
- `/photography/<slug>/`

Also do a quick editorial sanity check on the photography index:

- no single album should dominate the page unintentionally
- preview image counts should stay reasonable for the current layout
- the photography index should use `thumb` assets
- album pages should use `display` assets inline and `src` for the larger lightbox view
- homepage or editorial photography callouts should generally use `display` assets rather than `full`
- no repo-internal implementation notes should leak into user-facing copy

### 12. Update The Homepage Visual Archive

After a new album is ingested and verified, review the Visual Archive section on the homepage (`pages/index.html`).

The homepage currently shows three photography cards in a 3-column grid (Los Angeles, Pacific Coast, Getty Villa). Each card is a manually authored `<article>` with a cover image and label.

After ingestion, decide whether any new album is strong enough to replace an existing homepage card:

- prefer albums with visually distinct covers that contrast well with each other (e.g. one urban/architectural, one landscape or coastal)
- use `@display.webp` variants for homepage cards, never `@full.webp` or `@thumb.webp`
- link the card directly to `/photography/<slug>/`
- keep the label text simple — the album title or a short descriptor, not a description paragraph
- if the new album is not a strong fit for the homepage, leave the existing cards in place and note the decision

The homepage cards are hand-authored and intentional — do not automate them or generate them from the album list. They represent a curated editorial choice, not an index.

## JSON Guidance

For photography or AI-media collections, prefer a shape like:

```json
{
  "slug": "laguna-beach-july-2023",
  "title": "Laguna Beach, July 2023",
  "description": "Coastal studies and late-afternoon light in Laguna Beach.",
  "cover": {
    "src": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover@full.webp",
    "display": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover@display.webp",
    "thumb": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover@thumb.webp",
    "originalSrc": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover.jpg",
    "width": 1600,
    "height": 1067,
    "alt": "Waves breaking against dark rocks near sunset."
  },
  "items": [
    {
      "src": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/001@full.webp",
      "display": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/001@display.webp",
      "thumb": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/001@thumb.webp",
      "originalSrc": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/001.jpg",
      "width": 2400,
      "height": 1600,
      "alt": "Foam patterns moving across wet sand."
    }
  ]
}
```

The exact schema can evolve, but for the current photography pipeline these album-level fields are required for reliable generation:

- `slug`
- `title`
- `cover` object with a non-empty `src`
- `items` array

`description` is strongly recommended. The current build can fall back to a default meta description when it is missing, but album copy should normally still be authored intentionally.

The core rule is stable:

- repo content stores canonical delivery references and useful metadata

For current photography albums, each image object should include at least:

- `src`
- `display`
- `thumb`
- `originalSrc`
- `width`
- `height`
- `alt`

`display` and `thumb` should be recorded explicitly when derivatives are generated so the runtime does not have to infer tiering later.

## Decision Heuristics

Prefer these defaults unless the user says otherwise:

- one subfolder usually means one album
- a folder full of similarly named image files usually belongs to one sequence
- choose the strongest representative horizontal frame as cover by default
- if the set is mostly portrait, a portrait cover is acceptable only if the page layout can support it cleanly
- avoid covers that feel redundant with another hero image already leading the same landing page
- if uncertain, use the first strong representative frame and state that assumption
- `photography` and `ai-media` should remain JSON-backed
- editorial page images should stay embedded in authored HTML
- new photography albums should be rendered through the shared renderer and generated routes, not custom page markup

Escalate when:

- the folder mixes unrelated concepts
- the naming implies multiple separate collections
- video and image treatment should diverge
- the inferred slug would be unstable or confusing

## What Not To Do

- Do not require a rigid folder schema before work can begin.
- Do not write a one-off parser every time the source folder shape changes.
- Do not invent permanent URL patterns that diverge from the repo’s media model.
- Do not upload first and figure out meaning later.
- Do not leave the repo pointing to temporary or local-only paths.
- Do not make runtime page rendering depend on the local source folder.

## Deliverable Summary

When reporting completion, include:

- what folder was ingested
- what interpretation was used
- the chosen title
- the chosen slug
- the chosen cover file
- where the assets were uploaded
- which repo files were updated
- any assumptions made
- any unresolved metadata that still needs human review

Also include:

- the exact R2 key prefix used
- whether the upload used preserved JPEG sources plus generated WebP derivatives
- whether album order followed filename sort or a curated order
- the JSON file created or updated
- whether `/photography/` and `/photography/<slug>/` were verified

## Relationship To Repo Docs

This skill is the operational source of truth for media ingestion.

`docs/media-ingestion-workflow.md` and `docs/image-delivery-plan.md` are deprecated historical planning docs kept for archival context only. If they conflict with this skill, this skill wins.

The media workflow notes in `AGENTS.md` remain current. If this skill and `AGENTS.md` disagree, update both together rather than letting them drift.
