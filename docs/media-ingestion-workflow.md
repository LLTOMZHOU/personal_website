> **Deprecated — historical archive only.**
> This document is a planning spec written before the media workflow was implemented. It proposed a script-based pipeline that was never built because the approach pivoted to AI-first. The operational source of truth is `skills/photo-ingestion-upload-serve/SKILL.md`. Do not update this doc; do not treat it as current guidance.

# Media Ingestion Workflow Plan

## Document Status

- Status: draft
- Purpose: define the workflow for taking local media assets, uploading them to Cloudflare, verifying delivery, updating site data or HTML, and publishing the changes
- Scope: photography, AI-media, project media, writing media, and site-level editorial assets such as homepage or about-page imagery

## Goals

The workflow should make it easy to:

- point the agent at a local folder of media
- inspect and validate the contents before upload
- upload media to Cloudflare in a repeatable way
- verify that every uploaded asset is reachable
- write the final CDN URLs into repo-managed JSON or authored HTML
- commit and publish the updated site

The workflow should also:

- remain compatible with Cloudflare free tier
- minimize manual URL editing
- support repeated runs without confusion
- keep enough metadata in the repo for future agent runs

## Product Fit

This workflow supports requirements from the site spec:

- photography and AI-generated media are first-class sections
- content stays managed in-repo without a CMS
- the site remains static at runtime
- media should feel intentional and curated, not manually stitched together
- the workflow must be practical for a single owner using GitHub and AI agents
- both collection-driven media and inline editorial media should fit into one coherent system

## Storage And Delivery Decision

Use Cloudflare R2 as the primary storage layer for uploaded media.

Use a public bucket or custom media domain for delivery.

Do not make Cloudflare Images the primary storage model for launch. It is not the right default for the zero-cost operating model we want.

At launch, the media stack should be:

- local source assets on disk
- optional local derivative generation
- upload to R2
- public delivery through Cloudflare CDN
- canonical media URLs stored in repo JSON

## High-Level Flow

The operational flow should be:

1. User points the agent to a local folder containing assets.
2. Agent inspects the folder and produces a validation summary.
3. Agent asks only the minimum missing questions needed to map the folder to a target collection.
4. Agent normalizes filenames and optionally prepares derivatives.
5. Agent uploads media to R2 under deterministic object keys.
6. Agent verifies that all public URLs return successfully.
7. Agent updates JSON or HTML in the repo with the canonical CDN URLs and metadata.
8. Agent runs the site build and validation checks.
9. Agent commits the changes and triggers the publish flow.
10. Agent verifies the live deployed result.

## Media Categories

The site has more than one kind of media, so the workflow should support multiple ingestion modes.

### Structured Collection Media

Examples:

- photography albums
- AI-media galleries
- project galleries when a project is strongly media-led

Characteristics:

- media belongs to a collection
- the collection is usually represented in JSON
- cover image and item order matter
- metadata is attached to the collection and to individual items

### Inline Editorial Media

Examples:

- images embedded inside a project writeup
- diagrams inside a writing page
- homepage feature images
- about-page portraits
- shared section covers or callout art

Characteristics:

- media is referenced directly by authored HTML
- order and placement are controlled by the page author
- JSON is not necessarily the source of truth
- the ingestion flow still needs to return canonical CDN URLs for insertion into HTML

### Shared Site Media

Examples:

- global hero treatments
- reusable background textures
- section thumbnails reused across pages

Characteristics:

- may not belong to a single article or collection
- should still use stable object keys and consistent delivery URLs

## Expected User Interaction

The user should be able to provide:

- a folder path on local disk
- the target content type such as photography or AI-media
- a collection slug or title if not already inferable
- any special metadata that is not discoverable from the files

The workflow should not require the user to:

- manually upload files one by one
- manually build CDN URLs
- manually edit every image reference in JSON

## Folder Intake

The ingestion step should accept a folder that may live outside the repo.

Examples:

- `/Users/yuxingzhou/Pictures/tokyo-trip/`
- `/Volumes/archive/ai-media/latent-series-03/`

The agent should first do read-only inspection.

It should report:

- file count
- supported and unsupported file types
- likely cover image candidates
- duplicate filenames
- unusual naming issues
- image dimensions where practical
- very large files that may need resizing or separate handling
- whether the folder looks more like a gallery set or an editorial asset set

## Validation Rules

Before upload, the workflow should validate:

- file extensions
- basic MIME-type consistency
- file readability
- non-empty files
- duplicate logical names after normalization
- missing or weak alt-text placeholders where metadata is expected later

It should also flag:

- files that are too large for the intended delivery use
- videos that may require separate treatment
- mismatches between folder name, slug, and target collection metadata

Validation should stop the workflow only for hard errors. Soft issues should be reported and confirmed.

## Naming And Object Key Strategy

Uploads should use deterministic object keys.

Example patterns:

- `photography/tokyo-2026/cover@full.webp`
- `photography/tokyo-2026/cover@display.webp`
- `photography/tokyo-2026/cover@thumb.webp`
- `photography/tokyo-2026/001@full.webp`
- `photography/tokyo-2026/001@display.webp`
- `photography/tokyo-2026/001@thumb.webp`
- `ai-media/latent-series-03/cover.webp`
- `ai-media/latent-series-03/frame-01.webp`
- `projects/glitch-witch/cover.webp`
- `projects/glitch-witch/telemetry-diagram.webp`
- `writing/agent-ui-friction/header.webp`
- `writing/agent-ui-friction/figure-01.webp`
- `site/home/hero-01.webp`
- `site/shared/about-portrait.webp`

Rules:

- use normalized slugs
- avoid spaces
- avoid timestamp-only names unless intentionally preserved
- keep collection names stable
- generate predictable derivative suffixes

This allows:

- re-runs without guessing
- easier verification
- easier JSON generation
- easier CDN URL inference

The exact prefix layout is not final yet, but the workflow should assume one consistent namespace for all public site media.

## Derivative Strategy

The workflow should support optional local derivative generation before upload.

At minimum, we should plan for:

- full-size lightbox asset
- mid-size display asset for inline album rendering
- smaller thumbnail asset for index and preview surfaces
- cover asset when needed

Possible output formats:

- WebP as the current default delivery format
- AVIF as a possible later optimization path if we adopt a clean fallback strategy
- original source retained for provenance and future derivative reruns

This should remain configurable per collection.

The initial workflow does not need to be fully automatic about visual quality decisions, but it should support consistent outputs.

## Metadata And JSON Shape

Photography and AI-media content should remain JSON-backed.

Suggested shape:

```json
{
  "slug": "tokyo-2026",
  "title": "Tokyo 2026",
  "description": "Street and architectural studies from Tokyo.",
  "cover": {
    "src": "https://media.example.com/photography/tokyo-2026/cover@full.webp",
    "display": "https://media.example.com/photography/tokyo-2026/cover@display.webp",
    "thumb": "https://media.example.com/photography/tokyo-2026/cover@thumb.webp",
    "originalSrc": "https://media.example.com/photography/tokyo-2026/cover.jpg",
    "width": 1600,
    "height": 1067,
    "alt": "Night street with neon reflections."
  },
  "items": [
    {
      "src": "https://media.example.com/photography/tokyo-2026/001@full.webp",
      "display": "https://media.example.com/photography/tokyo-2026/001@display.webp",
      "thumb": "https://media.example.com/photography/tokyo-2026/001@thumb.webp",
      "originalSrc": "https://media.example.com/photography/tokyo-2026/001.jpg",
      "width": 2400,
      "height": 1600,
      "alt": "Concrete overpass and signage."
    }
  ]
}
```

Rules:

- JSON should store canonical delivery URLs, not local paths
- dimensions should be recorded when practical
- cover should be explicit rather than inferred at runtime
- alt text should be supported even if some entries begin as placeholders
- where derivative tiering exists, `src`, `display`, `thumb`, and `originalSrc` should be explicit rather than inferred later

For inline editorial assets, the workflow should instead produce a URL mapping that can be written into HTML.

Example shape:

```json
{
  "slug": "agent-ui-friction",
  "type": "writing",
  "assets": [
    {
      "localName": "header.avif",
      "src": "https://media.example.com/writing/agent-ui-friction/header.avif",
      "width": 1800,
      "height": 1000,
      "alt": "Header image placeholder"
    }
  ]
}
```

This gives the agent a stable source for HTML patching without requiring inline media to become JSON-rendered content.

## Upload Mechanism

The upload implementation should prefer a repeatable script over ad hoc manual commands.

Likely implementation options:

- `wrangler` if it gives us the needed R2 upload ergonomics
- an S3-compatible uploader for R2
- a custom Node ingestion script that wraps the chosen upload tool

The preferred operating model is:

- local script performs validation and upload
- script emits a manifest of uploaded objects and public URLs
- repo JSON or authored HTML is updated from that manifest

The Cloudflare MCP is useful for account-aware operations and inspection, but bulk object upload may still be easier through a local CLI or a small script.

## Verification Requirements

After upload, the workflow should verify:

- object count matches the manifest
- every expected CDN URL returns `200`
- MIME type is sensible for the file
- a random sample of assets opens correctly
- cover image URLs are valid

If verification fails:

- do not update JSON blindly
- report the mismatch
- allow retry or cleanup before publish

## Repo Update Step

After successful verification, the workflow should:

- update the target collection JSON when the media belongs to a JSON-backed collection
- update authored HTML when the media belongs to a project page, writing page, or site-level editorial page
- update any derived index or manifest files
- update any homepage curation references if needed

The repo should record enough information that a future agent can understand:

- where assets were uploaded
- which JSON or HTML file owns the references
- what slug and object key prefix were used

## Rough Ingestion Modes

The workflow should likely support a few rough modes rather than one rigid pipeline.

### Collection Mode

Used for:

- photography
- AI-media
- selected media-heavy project collections

Behavior:

- inspect folder
- upload assets
- verify URLs
- update JSON
- optionally update collection indexes

### Editorial Mode

Used for:

- project articles
- writing pages
- homepage imagery
- shared site assets

Behavior:

- inspect folder
- upload assets
- verify URLs
- return or apply HTML URL replacements
- optionally update related metadata manifests

### Mixed Mode

Used when:

- a project has both structured gallery media and inline article media

Behavior:

- use one upload session
- split outputs into JSON-managed assets and HTML-managed assets
- keep one manifest for auditability

## Build And Publish Step

After JSON updates, the workflow should:

- run the site build
- run any validation checks
- confirm that generated pages reference valid media URLs
- commit the content and data changes
- push to GitHub
- let Cloudflare Pages publish from the connected branch

After deployment, the workflow should verify:

- the relevant live page loads
- the gallery assets render from the expected media domain
- there are no broken media references on the published route

## Proposed File And Script Layout

Suggested repo additions:

- `content/photography/*.json`
- `content/ai-media/*.json`
- `pages/projects/*.html`
- `pages/writing/*.html`
- `scripts/ingest-media.mjs`
- `scripts/lib/media-validate.mjs`
- `scripts/lib/media-derive.mjs`
- `scripts/lib/media-upload.mjs`
- `scripts/lib/media-verify.mjs`
- `scripts/lib/media-apply-html.mjs`
- `scripts/lib/media-apply-json.mjs`

Optional generated artifacts:

- `data/media-upload-manifests/<slug>.json`

The manifest should be treated as an audit trail for repeatability, not as the public content source of truth.

## Agent Workflow Contract

The intended agent behavior should be:

1. Inspect folder.
2. Summarize findings.
3. Ask only missing high-value questions.
4. Prepare upload plan.
5. Upload.
6. Verify.
7. Update repo files.
8. Build and validate.
9. Commit and publish.
10. Verify live site.

The agent should not skip verification or jump straight to editing JSON before upload success is established.

## Required Configuration

The workflow will eventually need:

- R2 bucket name
- public media domain or bucket delivery URL
- credentials or authenticated local tooling
- site JSON locations for photography and AI-media
- page HTML locations for writing, projects, and site-level editorial assets
- a clear convention for collection slugs

These should be kept in configuration, not scattered across scripts.

## Open Questions

- Should originals be uploaded alongside derived web assets, or stored only locally?
- What derivative sizes should be standard for photography?
- Should editorial/article images use a different derivative policy than gallery images?
- Do we want a separate bucket prefix for drafts versus published assets?
- Should uploads be immutable by key, or should reruns overwrite existing objects?
- Do we want ingestion manifests committed to the repo or kept local?
- How should alt text be authored during ingestion for large sets?
- How should video assets be handled if AI-media starts including large files?
- Should homepage and shared editorial assets have a distinct `site/` namespace or live under page-specific prefixes?

## Next Build Steps

The implementation should be done in this order:

1. Define the JSON schema for photography and AI-media entries.
2. Define the HTML reference strategy for inline editorial media.
3. Define the R2 key naming convention and media domain format.
4. Implement folder inspection and validation.
5. Implement upload to R2.
6. Implement post-upload verification.
7. Implement JSON and HTML update from manifest.
8. Integrate build, commit, and publish steps.
9. Test the workflow on both a small collection and a page with inline images.
