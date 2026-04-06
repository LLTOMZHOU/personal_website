# Site Assembly And Bundling Plan

## Document Status

- Status: draft
- Purpose: define how authored pages, shared site chrome, bundled assets, metadata, analytics, and interactive features fit together
- Scope: static page assembly, Vite responsibilities, shared shell design, and runtime bundle boundaries

## Core Decision

The site should use authored page content wrapped in a shared shell during build.

This means:

- writing and project pages can remain creatively authored
- global site chrome stays centralized
- metadata remains consistent
- analytics and assistant entry points are harder to forget
- Vite can stay focused on asset bundling rather than owning page generation

## What Gets Authored

The primary authored page files should contain page-specific content, not the full repeated site document shell.

Examples:

- home page body content
- project article content
- writing article content
- about page content

These pages should remain highly flexible and can include:

- bespoke HTML structure
- custom inline editorial layout
- embedded figures and callouts
- placeholders or hooks for page-specific JavaScript behavior

## What The Shared Shell Owns

The shared shell should own the global document structure and repeated product concerns.

It should provide:

- `<!doctype html>`
- `<html>` and `<body>`
- shared `<head>` structure
- global CSS asset includes
- global site navigation
- footer
- analytics includes
- assistant launcher shell
- default JavaScript bundle includes
- page-specific bundle injection when declared

The shell is also the natural place to enforce consistency for:

- titles
- descriptions
- canonical URLs
- social preview metadata
- viewport metadata
- font loading

## Why This Model Is Better Than Full Standalone HTML Per Page

If every page is a full HTML document, then each page has to remember to include:

- the same nav
- the same footer
- the right metadata conventions
- the analytics script
- the assistant entry point
- the correct hashed bundle filenames

That creates too much duplication and too many ways for pages to drift apart.

The wrapped-content approach preserves visual freedom inside the page while keeping the site coherent as a product.

## Vite Scope

Vite should be used for asset bundling, not for site ownership.

Vite should handle:

- JavaScript bundling
- CSS bundling
- code splitting
- minification
- hashed production filenames
- development-time serving for front-end assets

Vite should not be responsible for:

- defining the route structure
- acting as the site framework
- owning the content model
- server-side rendering

## Build Responsibilities

The overall build process should have two layers.

### Layer 1: Asset Build

Vite builds:

- global CSS
- shared site JavaScript
- assistant bundle
- optional page or feature bundles such as gallery, search, or motion

Vite outputs production assets plus a manifest that maps entry names to hashed files.

### Layer 2: Static Page Assembly

A small custom build script:

- reads authored page content
- reads page metadata
- wraps the page content with the shared shell
- injects the correct asset URLs from the Vite manifest
- writes final HTML to the static output directory

This keeps concerns separated:

- Vite packages browser assets
- the site assembler creates the final pages

## Suggested Page Model

The likely source of truth for a page should be:

- authored HTML content
- a small metadata sidecar

Examples:

- `pages/projects/glitch-witch.html`
- `pages/projects/glitch-witch.meta.json`
- `pages/writing/agent-ui-friction.html`
- `pages/writing/agent-ui-friction.meta.json`

The metadata sidecar should define things such as:

- page title
- description
- canonical path
- open graph image
- which optional bundles to include

This keeps metadata structured while preserving full freedom in the authored HTML.

## Suggested Metadata Shape

Rough example:

```json
{
  "title": "Glitch Witch",
  "description": "UE5 capstone game project focused on systems-heavy gameplay and telemetry.",
  "path": "/projects/glitch-witch/",
  "ogImage": "https://media.example.com/projects/glitch-witch/cover.avif",
  "bundles": ["gallery", "project-glitch-witch"]
}
```

This is not locked yet, but it captures the right boundary.

## First-Pass Metadata Sidecar Proposal

The first version of the metadata sidecar should stay small and explicit.

Suggested fields:

- `title`
- `description`
- `path`
- `section`
- `ogImage`
- `bundles`
- `bodyClass`
- `canonicalUrl` as optional override
- `noIndex` as optional override

### Proposed Meaning

`title`

- page title used in document metadata

`description`

- short description for SEO and social sharing

`path`

- canonical route path for the generated page

`section`

- one of the major site sections such as `home`, `projects`, `writing`, `photography`, `ai-media`, or `about`
- used for nav active state and analytics labeling

`ogImage`

- social preview image URL

`bundles`

- optional list of extra asset bundles beyond the global site bundle

`bodyClass`

- optional class string for page-level styling hooks

`canonicalUrl`

- optional explicit canonical URL if it differs from the site base URL plus `path`

`noIndex`

- optional boolean for pages that should not be indexed

### Proposed Example

```json
{
  "title": "Glitch Witch",
  "description": "UE5 capstone game project focused on systems-heavy gameplay and telemetry.",
  "path": "/projects/glitch-witch/",
  "section": "projects",
  "ogImage": "https://media.example.com/projects/glitch-witch/cover.avif",
  "bundles": ["gallery"],
  "bodyClass": "page-project page-project-glitch-witch"
}
```

### Intentional Omissions

The first version should not try to carry everything.

Do not put these in the sidecar unless a real need appears:

- full content data
- inline image manifests
- giant theme objects
- navigation structure
- full analytics configuration

Those concerns belong elsewhere.

## Runtime Bundle Strategy

The site should ship only what each page needs.

### Global Bundle

One small shared bundle should exist for site-wide behaviors such as:

- nav behavior
- analytics wiring
- global assistant launcher hook
- small progressive enhancement behaviors shared across the site

This bundle should remain small.

### Feature Bundles

Separate bundles should exist for behaviors that are not universal.

Likely candidates:

- `assistant`
- `search`
- `gallery`
- `motion-home`
- `motion-project`

These should only load on pages that need them, or load lazily on user intent.

### Assistant Bundle

The assistant is the strongest candidate for a separately loaded bundle.

Rules:

- do not load the assistant runtime on every page by default if not needed
- prefer lazy loading on click, focus, or idle
- isolate assistant complexity from the core site experience

If React is used, it should likely live only in this bundle at first.

## First-Pass Bundle List

The initial bundle plan should be simple and conservative.

### `site`

Always included.

Responsibilities:

- global nav enhancement
- mobile nav behavior
- assistant launcher hook
- shared analytics event plumbing
- lightweight progressive enhancement helpers used across pages

Constraint:

- this bundle should stay small and should not pull in React or a motion library

### `assistant`

Loaded lazily.

Responsibilities:

- assistant UI runtime
- assistant state management
- local conversation memory
- assistant analytics events

Constraint:

- load on click, focus, or another explicit intent signal
- if React is used anywhere first, it should likely live here

### `gallery`

Included only where needed.

Responsibilities:

- gallery interaction
- lightbox behavior
- next/previous controls
- keyboard interaction for image browsing

Targets:

- photography pages
- AI-media pages
- selected project pages with structured media galleries

### `search`

Included only where needed.

Responsibilities:

- loading the static search index
- filtering results
- handling search UI events

Targets:

- projects index
- writing index
- any cross-site search surface

### `motion-home`

Included only on pages with deliberate scripted homepage motion.

Responsibilities:

- page-specific entrance choreography
- scroll-triggered homepage effects
- art-directed motion sequences beyond CSS

### `motion-page`

Optional pattern for later.

Responsibilities:

- page-specific scripted motion for a project or writing page

Targets:

- only pages that truly need it

### `booking`

Defer until it exists.

Responsibilities:

- any future booking workflow attached to the assistant or another page

This should not exist until a real booking feature exists.

## Bundle Loading Rules

The shell should always include:

- global CSS
- the `site` bundle

The shell should conditionally include:

- any bundles listed in page metadata

The shell should allow certain bundles to be loaded lazily instead of eagerly.

The most obvious lazy bundle is:

- `assistant`

Possible later lazy candidates:

- `search`
- `gallery`
- some motion bundles

## Recommended First-Pass Defaults

Use these defaults unless a page clearly needs more:

- every page gets `site`
- no page eagerly loads `assistant`
- photography and AI-media pages get `gallery`
- projects and writing index pages get `search` when search exists
- only the homepage gets a motion bundle if scripted motion is adopted early

## Motion Bundle Strategy

We should plan to adopt either GSAP or Anime.js for scripted motion when concrete motion requirements justify it.

The motion library should not become a universal dependency unless the site truly benefits from that.

Preferred rule:

- CSS handles baseline motion
- a motion library is loaded only by pages or sections that need scripted choreography

This avoids making every page pay for the heaviest visual treatment.

## Analytics Strategy

Analytics should be treated as a shared-shell concern.

The shell should inject:

- the baseline analytics script
- any shared event plumbing needed by the site bundle

The site bundle can then handle event emission for:

- navigation interactions
- assistant opens
- assistant conversation starts
- key content interactions
- search usage
- gallery engagement

This keeps analytics implementation centralized and consistent.

## Navigation Strategy

Navigation should also be treated as a shared-shell concern.

The shell should render:

- primary navigation
- active-state support based on page metadata or route path
- assistant entry point
- any consistent mobile-nav structure

The global site bundle can progressively enhance this navigation if needed, but the markup should be usable without JavaScript.

## CSS Ownership

CSS should also follow a layered structure.

Suggested layers:

- global foundation styles
- shared component styles
- page-specific styles where needed

This allows:

- a coherent visual system
- freedom for art-directed page treatments
- controlled bundle growth

## Rough File Layout

Possible structure:

- `pages/`
- `pages/projects/*.html`
- `pages/projects/*.meta.json`
- `pages/writing/*.html`
- `pages/writing/*.meta.json`
- `pages/about.html`
- `pages/about.meta.json`
- `src/client/site.ts`
- `src/client/assistant/entry.tsx`
- `src/client/search.ts`
- `src/client/gallery.ts`
- `src/client/motion-home.ts`
- `src/styles/global.css`
- `src/styles/prose.css`
- `src/styles/components.css`
- `scripts/build-site.mjs`

## Build Output Responsibilities

The assembled site output should include:

- final HTML files
- bundled CSS
- bundled JavaScript
- generated indexes such as search or assistant context where needed
- copied static assets that belong in the site output

The media CDN should remain separate from the static site output.

## Open Decisions

The following items still need to be finalized:

- exact metadata schema
- exact bundle names and boundaries
- whether page-specific styles are emitted as separate assets or merged
- whether the assistant launcher shell is always present or route-dependent
- when to load assistant code by default, if ever
- how motion bundles map to real page designs

## Recommended Defaults

Current recommended defaults:

- wrapped authored page content rather than full standalone HTML documents
- Vite used only for asset bundling
- metadata in sidecar JSON files
- one small global `site` bundle
- one separately loaded `assistant` bundle
- optional page or feature bundles for search, gallery, and motion
- analytics injected by the shared shell
- navigation rendered by the shared shell and enhanced progressively

## Next Steps

The next build-phase decisions should be:

1. finalize the metadata sidecar shape
2. define the first-pass bundle list
3. define the shared shell structure
4. define the page source directory conventions
5. decide how the assistant launcher and bundle are loaded
