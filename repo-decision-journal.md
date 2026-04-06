# Repo Decision Journal

## Purpose

This file is a long-lived internal reference for how the site architecture evolved, why key decisions were made, what trade-offs were explicitly accepted, and what is still intentionally unresolved.

It is not part of the build.

It is not a source of runtime configuration.

It is not a product-facing artifact.

It exists so future work on this repo can understand the reasoning behind the current system instead of reverse-engineering intent from code alone.

## Source Material

This journal consolidates:

- the original product requirements in [spec.md](/Users/yuxingzhou/Local_Projects/personal_website/spec.md)
- the technical direction in [tech-stack.md](/Users/yuxingzhou/Local_Projects/personal_website/tech-stack.md)
- the page assembly model in [site-assembly-and-bundling-plan.md](/Users/yuxingzhou/Local_Projects/personal_website/site-assembly-and-bundling-plan.md)
- the media workflow notes in [media-ingestion-workflow.md](/Users/yuxingzhou/Local_Projects/personal_website/media-ingestion-workflow.md)
- the image strategy in [image-delivery-plan.md](/Users/yuxingzhou/Local_Projects/personal_website/image-delivery-plan.md)
- the repo operating instructions in [AGENTS.md](/Users/yuxingzhou/Local_Projects/personal_website/AGENTS.md)
- the architectural discussions that led from the original Next.js setup to the current static-first rebuild

## Product Goals Recap

The site is meant to function as all of the following at once:

- a personal website
- a portfolio and credibility surface
- a writing and publishing surface
- a first-class photography and AI-media surface
- a design-forward artifact, not a generic portfolio
- an interactive demonstration surface for AI and agent work

The most important product requirements from the spec are:

- strong first-impression identity
- high-quality presentation of projects and writing
- photography and AI-generated media as first-class navigation pillars
- easy long-term maintenance without a heavyweight CMS
- room for an assistant/chat experience
- enough observability to iterate later

## The Core Architectural Turn

The repo originally contained a Next.js and Turborepo setup.

That direction was explicitly rejected after discussion.

The critical reasoning was:

- SSR was not wanted
- middleware was not wanted
- React Server Components were not wanted
- Vercel was not being considered
- the site should be thin by default
- most pages should ship as static HTML with minimal JavaScript
- Cloudflare free tier should shape the architecture

The result was a deliberate reset:

- remove the old app structure
- rebuild from the ground up as a static-first site
- use Vite only for JS and CSS bundling
- use a custom build system to assemble final pages
- host on Cloudflare Pages

This was not a partial migration.

It was an explicit decision to stop carrying framework complexity that was no longer aligned with the product.

## High-Level Decisions

### 1. Static by Default

The site should be pre-rendered ahead of time and served as static files.

Accepted:

- static HTML output
- static CSS
- minimal client-side JS
- Cloudflare Pages as the serving layer

Rejected:

- SSR for normal site browsing
- middleware on the critical path
- framework-owned server runtime
- page rendering that depends on request-time compute

Why:

- aligns with the owner’s stated preference
- fits free-tier hosting constraints
- reduces runtime complexity
- keeps the site inspectable and durable

### 2. Vite as a Bundler, Not a Framework

Vite is used because it is a fast dev/build tool, not because it owns the site.

Accepted:

- Vite for CSS and JS bundling
- hashed production assets
- code splitting
- a small number of entry bundles

Rejected:

- Vite as the routing model
- Vite as the content model
- Vite as the page-authoring system

This distinction matters:

- the build system decides what pages exist
- Vite decides how browser assets are packaged

### 3. Authored HTML Is a First-Class Source Format

Projects and writing pages are intentionally authored directly in HTML rather than Markdown or MDX.

Why this was chosen:

- the owner wants maximum creative freedom per page
- AI agents can generate bespoke HTML effectively
- the team does not want content to be forced through a constrained prose-first format
- the site should support custom page structure and embedded editorial composition without fighting a content abstraction

This decision specifically rejected:

- MDX as the primary authoring model
- typed frontmatter as a default requirement
- a CMS-first mindset
- content loaders that create unnecessary complexity for authored pages

### 4. Shared Shell Plus Authored Page Bodies

The repo does not use fully standalone HTML documents for every page.

Instead:

- page files contain the page body
- metadata lives in sidecar `*.meta.json` files
- the build step wraps page bodies in a shared shell

Why:

- avoids duplicating nav, footer, metadata, assistant launcher, and asset tags
- reduces drift between pages
- keeps authored page content expressive without making every page responsible for global concerns

This was chosen over:

- full-document raw HTML per page
- framework layouts
- runtime-inserted shared chrome

### 5. React Only Where It Earns Its Cost

The repo is not React-first.

React is allowed, but only for bounded, stateful experiences.

Current intended use:

- the assistant is the primary candidate for a React island

The rest of the site should prefer:

- HTML for structure
- CSS for styling and simple motion
- plain JavaScript for lightweight enhancements

Reasoning:

- most of the site does not need framework hydration
- a React runtime on ordinary pages would violate the “thin by default” goal
- the assistant is stateful enough to justify a heavier client-side model later

### 6. Hydration as an Exception, Not the Default

A major conceptual decision during the discussion was:

- static HTML should render first
- interactivity should attach later only where needed

Three distinct modes were established:

- no hydration at all
- plain JavaScript enhancement
- React hydration for bounded islands

The assistant falls into the third category.

Most other interactions fall into the second.

This means the site is progressive-enhancement-first, not app-shell-first.

### 7. CSS-First Motion Strategy

The site should feel polished, but not because it ships a large animation runtime everywhere.

Accepted baseline:

- CSS transitions
- CSS keyframes
- transform and opacity treatments
- subtle reveal and hover systems

JavaScript motion is reserved for:

- cases CSS cannot do cleanly
- higher-order sequencing
- future motion-heavy pages that actually justify it

The motion library choice was intentionally deferred.

The likely candidates discussed were:

- GSAP
- Anime.js

No final decision was made because the right answer depends on the first real motion-heavy page rather than abstract preference.

### 8. Cloudflare-First Hosting and Media Direction

Cloudflare was a hard constraint from the owner.

That led to these choices:

- Cloudflare Pages for site hosting
- avoid Vercel entirely
- keep normal browsing off Workers/Functions
- shape the system around static delivery on the free tier

For media, the key decision was:

- use Cloudflare R2 for media storage and delivery at launch
- do not make Cloudflare Images the primary storage model

Why:

- better fit for free-tier constraints
- clearer operational model
- easier to use as the backend for a custom ingestion workflow

### 9. One Unified Media System

A major refinement during the design discussions was that media should not be split into unrelated systems.

The final direction was:

- structured collection media for photography and AI-media
- inline editorial media for projects, writing, homepage, and shared site imagery
- one shared upload/delivery model under Cloudflare R2

That means the same ingestion workflow should eventually support:

- JSON-backed gallery collections
- images referenced directly in authored HTML
- site-wide shared assets

### 10. Video Is External

Video hosting is not part of the site’s storage model.

Accepted:

- embedded external video links

Rejected:

- self-hosted video delivery
- a custom internal video platform

This keeps complexity low and reflects the fact that video is not a major content volume for the site.

## Chronological Decision Narrative

### Phase 1: Reframing the Technical Question

The initial framing was “what tech stack should this site use?”

That quickly shifted into the more accurate question:

- what static publishing and bundling system best fits the actual constraints?

The critical user constraints were:

- avoid SSR
- avoid heavy framework runtime
- do not depend on Vercel
- prefer Cloudflare free tier
- do not force MDX or a CMS
- keep most pages thin

This was the point where the architecture moved away from “framework comparison” and toward “static delivery plus selective enhancement.”

### Phase 2: Clarifying Interactivity

The next important discussion separated different types of interactivity:

- motion and presentation polish
- small UI interactions like search or filters
- truly app-like interaction such as the assistant

That led to the layered model:

- CSS motion first
- plain JS for lightweight behavior
- React only for state-heavy islands

This was important because it prevented the repo from drifting back into a React-everywhere mindset.

### Phase 3: Rejecting Markdown as the Default Editorial Format

The owner clarified that:

- project pages and writing pages should not be constrained by Markdown
- AI agents will generate and refine HTML directly
- creativity and page-specific composition are more important than fitting content into a standard format

This locked in a key difference in the content model:

- writing and project pages are authored HTML
- photography and AI-media remain more structured and data-backed

### Phase 4: Choosing the Shared Shell Model

Once authored HTML was accepted, the next question was whether each page should be a full document or just body content wrapped at build time.

The wrapped-content model won because it keeps:

- metadata consistent
- nav and footer centralized
- analytics harder to forget
- assistant entry points consistent
- bundle injection manageable

This became the basis for the custom builder.

### Phase 5: Rebuilding the Repo

The old Next.js app was intentionally discarded.

The repo was rebuilt around:

- root-level Vite configuration
- a custom site build script
- a shared shell
- page body HTML plus sidecar metadata
- static output into `dist/`

This was the implementation of the conceptual decisions already made in the earlier discussion.

### Phase 6: Design Mocks Turned into Real Routes

Once the system existed, mocked page designs were turned into actual page implementations:

- homepage
- projects index
- photography / visual archive page
- writing index

These were implemented faithfully to the provided editorial mocks while still living inside the shared shell architecture.

This demonstrated that the chosen architecture could support highly art-directed pages without needing a framework-owned page model.

### Phase 7: Hardening and Review-Driven Cleanup

The PR review phase forced several additional clarifications:

- build and preview path handling needed hardening
- metadata interpolation needed escaping
- some pages were shipping misleading interactive affordances
- empty optional bundles should not be shipped
- dev/build docs needed to explain `SITE_URL`
- Node engine expectations needed to be made explicit

These did not change the architecture, but they made it more rigorous and self-consistent.

## Current Implemented Architecture

At the time of writing, the repo follows this model:

- page bodies in `pages/`
- per-page metadata in `pages/*.meta.json`
- shared shell in `scripts/lib/site-shell.mjs`
- custom build orchestration in `scripts/build-site.mjs`
- Vite for JS/CSS bundling in [vite.config.mjs](/Users/yuxingzhou/Local_Projects/personal_website/vite.config.mjs)
- shared client code in `src/client/`
- shared styles in `src/styles/`
- static output in `dist/`

Global assumptions:

- `site` bundle is always included
- `assistant` bundle is always injected by the build system
- optional bundles should only exist if they earn their runtime cost

## Accepted Trade-Offs

These are intentional trade-offs, not accidental omissions.

### Manual Authorship Over Uniform Content Tooling

Accepted trade-off:

- more page-level freedom
- less standardized authoring

Why it was accepted:

- the site values taste and bespoke layout more than content uniformity

### Custom Build System Over Framework Convention

Accepted trade-off:

- more responsibility in repo-level scripts
- less out-of-the-box framework structure

Why it was accepted:

- the product requirements were simpler than a full framework stack
- the desired runtime was thinner than a typical framework deployment

### Static Site With Isolated JS Over Full Front-End App

Accepted trade-off:

- some dynamic behavior must be built manually
- in exchange, most pages stay extremely light

Why it was accepted:

- the site is primarily editorial and presentational
- only a small subset of features need app-like behavior

### Deferred Motion Library Decision

Accepted trade-off:

- motion tooling remains undecided for now
- avoid prematurely standardizing on GSAP or Anime.js

Why it was accepted:

- the first real motion-heavy implementation should decide the tooling, not abstract preference

### Deferred Analytics Implementation

The spec wants analytics and observability, but this is still deferred in code.

This is not because analytics was rejected.

It was deferred because:

- architecture and page system came first
- analytics should fit the static-first model cleanly
- the exact data and provider choices are still product decisions

## Rejected Directions

These directions were discussed and intentionally not chosen.

### Next.js as the Main Site Runtime

Rejected because:

- most of its runtime/server features were not wanted
- it would add conceptual and operational weight not justified by the product

### Astro as the Chosen Default

Not selected.

Astro was relevant as a static-site option, but the final preference became:

- custom build system plus Vite

Reason:

- maximum authorial control
- minimal abstraction
- direct fit for authored HTML pages

### CMS-Driven Content Workflow

Rejected because:

- the owner wants repository and GitHub-based publishing
- a CMS would not help enough to justify its complexity at this stage

### MDX as the Primary Editorial Format

Rejected because:

- it constrains page design too early
- authored HTML is better aligned with the intended workflow

### Self-Hosted Video

Rejected because:

- low value for current content volume
- unjustified operational complexity

## Media Strategy Summary

The media plan has several layers.

### Current State

Many current page images began as remote placeholder assets used to realize the design mocks quickly.

These are understood to be temporary.

### Intended Future State

The desired system is:

1. ingest source media from a local folder
2. validate structure and metadata
3. optionally generate derivatives
4. upload to Cloudflare R2
5. verify public delivery URLs
6. write canonical URLs into JSON or authored HTML
7. rebuild and publish

### Image Delivery Features Planned

The future pipeline should provide the useful parts people often associate with `next/image`, but without requiring a framework runtime:

- AVIF and WebP output
- responsive derivatives
- `srcset` and `sizes`
- explicit dimensions
- lazy loading for below-the-fold images
- eager loading or high priority for hero images
- `decoding="async"` where appropriate
- possible blur placeholders later

This is explicitly planned as a build and ingestion concern, not a request-time transformation concern.

## AI Assistant Positioning

The assistant is important to the product identity, but it should not dictate the entire architecture.

Established principles:

- the assistant is a major interactive surface
- it may justify React
- it should remain isolated
- visitors who do not use it should not pay a heavy runtime cost
- it should be loaded lazily

This is one of the clearest examples of the repo’s general philosophy:

- rich interaction where it matters
- restraint everywhere else

## Build and Dev Expectations

The working assumptions for the repo are:

- `pnpm build` produces the static site
- `SITE_URL` must be set for canonical metadata
- `pnpm dev` runs the local rebuild plus preview loop
- generated output in `dist/` should never be edited directly

The builder is not just a wrapper around Vite.

It owns:

- metadata validation
- route normalization
- final page assembly
- shell wrapping
- asset manifest consumption

## Review Workflow Lessons

The repo also accumulated some operational rules during PR review work:

- reply to implemented review items only after the fix exists
- use `done` for straightforward cases
- use `good point, done` for genuinely helpful catches
- when replying `good point, done`, resolve the thread if the fix is complete
- leave ambiguous product-judgment comments to the owner

Those rules now live in [AGENTS.md](/Users/yuxingzhou/Local_Projects/personal_website/AGENTS.md), but they are part of the repo’s evolving workflow practice as much as the code itself.

## Branch and Review Policy Notes

An operational detail that matters for future workflow:

- the repo currently uses GitHub repository rulesets rather than classic branch protection
- `main` is configured to require PR-based changes
- it also requires an approving review

One implication:

- if Codex or Claude opens PRs through the owner’s GitHub identity, GitHub still treats the PR as authored by that identity
- the owner cannot request review from themselves
- their own review will not satisfy the “needs an approving review from someone else” rule

This does not change the architecture, but it does affect how AI-authored changes should move through the repo later.

## What Is Still Open

Several important things remain intentionally open.

### Motion Library

Still undecided:

- GSAP
- Anime.js

Decision trigger:

- choose when a real motion-heavy page is being built

### Analytics and Observability

Still not fully implemented.

Expected shape:

- privacy-conscious analytics
- assistant interaction events
- enough instrumentation to support iteration

### Real Media Ingestion Tooling

The workflow has been designed conceptually, but the actual tooling still needs implementation.

### Search and Gallery Behavior

The repo has placeholders and design intent, but the full client-side behavior is still future work.

### Assistant Product Depth

The assistant is architecturally accounted for, but not yet implemented as the full product surface described in the spec.

## Current North Star

The current architecture should be understood as serving this specific ideal:

- static, durable, and cheap by default
- design-forward and expressive in presentation
- editable through direct HTML and repository files
- progressively enhanced rather than framework-dominated
- capable of supporting a richer assistant and media workflow without making those concerns the cost center for every ordinary page

## Guidance for Future Changes

When making future decisions, prefer the option that best preserves the following:

- static output over server dependence
- authored HTML over over-abstracted content tooling
- small default runtime over framework sprawl
- isolated interactivity over app-wide hydration
- consistent shell and metadata handling over page duplication
- media workflow unification over ad hoc asset handling
- deliberate design quality over generic implementation convenience

If a future change conflicts with those principles, it should not be rejected automatically, but it should be treated as a real architectural change rather than a harmless local tweak.

## Why This File Exists

Without this file, future contributors would mostly infer intent from code and a handful of narrower design docs.

That would miss several important facts:

- the current system is the result of explicit rejection of a heavier framework model
- authored HTML was a deliberate creative choice, not a temporary shortcut
- the Cloudflare and free-tier constraints materially shaped the system
- React was constrained on purpose
- media, motion, and analytics were discussed as layered systems with specific boundaries

This journal exists to keep those decisions legible over time.
