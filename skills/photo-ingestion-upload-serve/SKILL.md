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
- `wrangler` is not installed as a repo dependency and there is no committed `pnpm` upload script yet
- the proven upload path currently uses original JPGs, not a standardized derivative pipeline

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

## Operating Flow

### 1. Inspect First

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

### 2. Infer The Intended Shape

Use judgment to determine what the folder most likely represents:

- one photography album
- multiple albums
- one editorial image set for a page
- one project gallery
- a mixed or ambiguous collection requiring clarification

Infer a proposed mapping before asking questions.

Good AI behavior here means presenting a probable interpretation, not dumping raw filesystem output and stopping.

### 3. Ask Only The Minimum Clarifying Questions

Only ask when the answer materially affects storage keys, page placement, or authored metadata.

Typical questions, if needed:

- Is this one album or several?
- Which item should be the cover?
- Should this live under `photography`, `ai-media`, `projects`, `writing`, or `site`?
- What title or slug should be canonical?
- Is the current file order intentional?

If the answers are obvious enough, proceed and state the assumptions.

### 4. Normalize Without Losing Meaning

Normalize the ingest plan, not necessarily the original source folder.

Prefer deterministic object keys such as:

- `photography/<slug>/cover.jpg`
- `photography/<slug>/001.jpg`
- `photography/<slug>/002.jpg`
- `projects/<slug>/cover.jpg`
- `writing/<slug>/figure-01.jpg`
- `site/shared/<name>.jpg`

Optimized formats are allowed, but do not claim they are the current standard if the real ingest is uploading JPGs.

Rules:

- use lowercase slugs
- avoid spaces
- prefer stable numbering for gallery items
- keep cover assets explicit
- avoid object keys that depend on temporary local folder names unless those names are already canonical

### 5. Use AI For Semantics, Not For Guessing Randomly

AI should help with:

- classifying the collection shape
- generating first-pass titles or descriptions from folder context
- proposing alt text drafts
- detecting weak naming
- identifying likely hero or cover images

AI should not silently invent critical metadata when confidence is low.

If confidence is low on something user-facing, surface the uncertainty.

### 6. Prepare Delivery Assets

Derivative generation is allowed, but it is not the defining step of the workflow.

When preparing assets:

- consider modern delivery formats such as `AVIF` or `WebP` when the workflow has a real derivative step
- keep originals locally if that is operationally useful
- create thumbnails or smaller derivatives when the target surface needs them
- preserve enough metadata to emit width, height, and alt text later

Do not block the workflow on perfect optimization if the main need is to get a clean, canonical media path into the site.

Current repo note:

- the working ingest path currently uploads original JPGs and records `width`, `height`, and `alt` in JSON
- derivative generation is still optional and not yet codified into the repo workflow
- unless the user explicitly wants optimization work, treat original JPG upload as the current default path

### 7. Upload To Canonical Storage

Upload to Cloudflare R2 using deterministic keys.

Current canonical target:

- bucket: `yuxingzhou-media`
- public domain: `https://media.yuxingzhou.me`

Current working operational path:

- authenticate `wrangler` locally on the machine being used
- use Wrangler to upload objects to R2
- do not assume there is a repo-local `wrangler` package or checked-in upload script

If the machine still has an `npx`/Node mismatch, use the already-working local Wrangler path rather than installing random new tooling mid-ingest.

Real key examples:

- `photography/laguna-beach-july-2023/cover.jpg`
- `photography/laguna-beach-july-2023/001.jpg`
- `photography/laguna-beach-july-2023/002.jpg`

Avoid:

- ad hoc bucket paths
- inconsistent prefixes
- one-off naming conventions for a single import

If rerunning an ingestion, favor predictability over novelty. The user should be able to infer where the object landed.

### 8. Verify Delivery

After upload, verify the public URLs.

Check:

- the URLs resolve successfully
- expected content types are served
- obvious missing objects or broken paths are caught before repo content is updated

Do not write final canonical URLs into the repo until delivery verification passes or the failure is explicitly acknowledged.

### 9. Write Repo References

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

### 10. Validate The Site

After content updates:

- run the site build with `SITE_URL` set
- confirm the affected page renders correctly
- check for broken references introduced by the ingestion

For photography albums, verify at least:

- `/photography/`
- `/photography/<slug>/`

## JSON Guidance

For photography or AI-media collections, prefer a shape like:

```json
{
  "slug": "laguna-beach-july-2023",
  "title": "Laguna Beach, July 2023",
  "description": "Coastal studies and late-afternoon light in Laguna Beach.",
  "cover": {
    "src": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/cover.jpg",
    "width": 1600,
    "height": 1067,
    "alt": "Waves breaking against dark rocks near sunset."
  },
  "items": [
    {
      "src": "https://media.yuxingzhou.me/photography/laguna-beach-july-2023/001.jpg",
      "width": 2400,
      "height": 1600,
      "alt": "Foam patterns moving across wet sand."
    }
  ]
}
```

The exact schema can evolve, but the core rule is stable:

- repo content stores canonical delivery references and useful metadata

For current photography albums, each image object should include at least:

- `src`
- `width`
- `height`
- `alt`

Do not invent `thumb` fields unless a real thumbnail object exists.

## Decision Heuristics

Prefer these defaults unless the user says otherwise:

- one subfolder usually means one album
- a folder full of similarly named image files usually belongs to one sequence
- the strongest horizontal or most representative frame is a reasonable cover candidate
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
- where the assets were uploaded
- which repo files were updated
- any assumptions made
- any unresolved metadata that still needs human review

Also include:

- the exact R2 key prefix used
- whether the upload used original JPGs or generated derivatives
- the JSON file created or updated
- whether `/photography/` and `/photography/<slug>/` were verified

## Relationship To Repo Docs

This skill operationalizes:

- `media-ingestion-workflow.md`
- `image-delivery-plan.md`
- the media workflow notes in `AGENTS.md`

If those documents and this skill disagree, prefer the repo’s architectural constraints and update the documents together instead of letting them drift.
