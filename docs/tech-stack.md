> **Deprecated — historical archive only.**
> Original tech stack decision doc written before the site was built. Superseded by the implemented site and consolidated into `docs/repo-decision-journal.md`. Do not update this doc.

# Tech Stack Decision

## Document Status

- Status: working decision draft
- Purpose: define the implementation direction for the personal website
- Decision scope: rendering model, hosting, authoring workflow, client-side interactivity, motion, and media strategy

## Final Direction

The website should be built as a static site and deployed to Cloudflare Pages.

The default delivery model should be:

- pre-rendered HTML
- static CSS
- minimal JavaScript
- no SSR
- no middleware
- no React Server Components
- no requirement for Next.js at serving time

The majority of the site should remain straightforward HTML and CSS at runtime.

JavaScript should be added only where it clearly improves the product:

- assistant UI
- search and filtering
- gallery controls or lightbox behavior
- mobile navigation
- deliberate motion beyond what CSS can do cleanly

## Why This Direction Fits

This approach aligns with the product goals and constraints:

- keeps the site thin by default
- avoids framework/runtime complexity that does not help the core experience
- works cleanly with Cloudflare free tier
- keeps content editing in GitHub and the publish pipeline
- preserves room for richer interactivity later
- makes it easier to keep the assistant isolated from the rest of the site

## Hosting Decision

Use Cloudflare Pages.

Rules:

- serve static assets from Cloudflare's CDN
- avoid Cloudflare Functions on the critical page-rendering path
- avoid per-request server logic for normal browsing
- design the site so normal page views do not depend on Workers invocations

This keeps the site compatible with a zero-cost operating model.

## Rendering Model

The site should be generated ahead of time into a static output directory such as `dist/`.

Each route should become a static HTML file at build time.

Examples:

- `/`
- `/projects/`
- `/projects/glitch-witch/`
- `/writing/`
- `/photography/`
- `/ai-media/`
- `/about/`

Preferred characteristics:

- plain HTML output
- strong metadata generation
- stable URLs
- no runtime dependency on a framework server

## Framework Stance

Next.js is not the target architecture.

If any framework is used, it should be used only as an offline build tool and not as a required production runtime. That said, the current preference is to avoid carrying Next.js if its main value is limited to tasks a smaller static build pipeline can handle.

React is acceptable, but only for bounded interactive islands.

React should not be the default rendering model for the full site.

## Build Pipeline

Preferred direction:

- small custom build pipeline
- static HTML generation
- asset bundling for CSS and client-side JavaScript
- deploy build output to Cloudflare Pages

Likely tooling shape:

- Node.js build scripts
- a lightweight bundler such as esbuild, Rollup, or Vite for client assets
- optional template layer for repeated page structures

The build system should optimize for:

- simplicity
- predictable output
- low bundle size
- easy inspection by humans and AI agents

## Content Authoring

The site does not need a CMS.

The intended workflow is:

- edit content in the repository
- commit via GitHub
- publish through the existing pipeline

The content system should stay simple. There is no requirement for:

- MDX
- typed frontmatter
- complex content loaders
- admin UI

Content should be stored in plain files that are easy to read and easy to transform into static pages.

Reasonable formats include:

- HTML fragments
- Markdown where useful
- JSON for structured metadata

The exact format can vary by content type as long as the result stays simple.

## Suggested Content Shape

Keep content explicit and boring.

Examples:

- `content/projects/project-slug.json`
- `content/writing/post-slug.md`
- `content/photography/album-slug.json`
- `content/ai-media/entry-slug.json`

Use separate static assets for images, thumbnails, and video posters.

If needed, generate derived files at build time such as:

- `search-index.json`
- `assistant-context.json`
- section manifests or route maps

This supports:

- client-side search
- client-side filtering
- assistant grounding against public content

## Client-Side Interactivity Strategy

The site should follow a progressive enhancement model.

### Default Rule

No hydration unless a feature actually needs stateful client-side behavior.

### Plain JavaScript By Default

Use plain JavaScript for:

- mobile nav toggles
- search and filtering
- gallery interactions
- lightboxes
- simple page-specific behaviors
- analytics events

### React Islands Where It Earns Its Cost

Use React only for bounded experiences that have enough state and UI complexity to justify it.

The main candidate is:

- AI assistant

Possible later candidates:

- richer booking flow
- highly stateful conversational navigation tools

React code should be loaded only when needed, ideally through lazy loading based on intent or idle time.

## Motion Strategy

The site should feel polished and intentional without shipping a large motion runtime by default.

### Motion Principles

- motion should support the visual system, not dominate it
- most effects should be cheap to render
- motion should degrade cleanly
- users who do not engage with advanced features should not pay much runtime cost

### CSS First

Use CSS for the baseline motion layer:

- hover and focus transitions
- page-load reveals
- subtle transform and opacity changes
- image treatments
- navigation feedback
- layout-safe decorative motion

### JavaScript Motion Second

Use JavaScript only when CSS becomes awkward or insufficient:

- scroll-triggered reveals
- staggered sequences
- timeline-based choreography
- interaction-driven motion state
- richer hero animations

### Motion Library Decision

Keep the final library choice open between:

- GSAP
- Anime.js

Both are viable for a custom build-and-bundle pipeline because neither requires React or SSR.

#### GSAP

Best when:

- motion is timeline-heavy
- scroll choreography becomes a meaningful part of the brand feel
- a few sections need very polished flagship interactions

Tradeoff:

- more capability, but also more weight and more temptation to over-animate

#### Anime.js

Best when:

- the site needs lightweight scripted animation beyond CSS
- timelines are useful but not extremely complex
- the goal is expressive enhancement rather than large scrollytelling set pieces

Tradeoff:

- less specialized than GSAP for very advanced scroll-driven work

### Motion Decision Rule

Start with:

- CSS for baseline motion
- no site-wide animation library until a real need appears

Adopt a library only when there is a concrete interaction or visual sequence that is meaningfully better with it than with CSS and small custom JavaScript.

## Search And Filtering

Search and filtering should be client-side.

Recommended approach:

- generate a static search index at build time
- load it in the browser when needed
- perform filtering and search locally

This avoids:

- backend search infrastructure
- runtime hosting costs
- unnecessary operational complexity

## AI Assistant Integration

The assistant is the primary justification for richer client-side interactivity.

The assistant architecture should follow these rules:

- UI shell can be interactive and client-rendered
- content grounding should come from curated public site data
- local conversation memory can stay in browser storage
- the assistant must not block the rest of the site
- the assistant bundle should be isolated from the base page experience

Implication:

- load the assistant only on intent, on idle, or through another explicit lazy-loading strategy

## Analytics And Observability

Use lightweight analytics only.

Preferred default:

- Cloudflare Web Analytics

Add a small custom event layer for:

- page views if needed beyond default analytics
- assistant opens
- conversation starts
- link suggestions clicked
- major navigation and section interactions

The analytics approach should remain:

- privacy-conscious
- lightweight
- free-tier compatible

## Image Strategy

Do not depend on a dynamic image service at launch.

Preferred launch model:

- optimize images ahead of time during the build process
- generate responsive variants where useful
- serve them as static assets through Cloudflare's CDN

Revisit dedicated media tooling later if:

- photography volume grows substantially
- image variant generation becomes operationally annoying
- video and heavy media workflows become central

## Video Strategy

Support video as a content type, but avoid building a custom video delivery stack initially.

Launch approach:

- use hosted video where practical
- use static poster images
- keep embeds responsive and lightweight

Revisit only when AI-generated video becomes a major section of the site.

## Recommended Initial Stack

- Cloudflare Pages for hosting
- static site generation
- plain HTML and CSS as the core output
- small custom build pipeline
- plain JavaScript for most interactive behaviors
- optional React islands for the assistant and other truly stateful UI
- CSS-first motion
- GSAP or Anime.js only if and when concrete motion needs justify them
- repo-based content editing through GitHub
- Cloudflare Web Analytics for baseline measurement

## Explicit Non-Goals

- SSR at launch
- framework-specific server features
- CMS adoption
- dynamic per-request rendering
- large site-wide client runtime
- forcing React onto content pages that do not need it

## Open Decisions

- whether the static generator should be fully custom or use a very small framework
- whether React is needed anywhere beyond the assistant
- whether GSAP or Anime.js is the better fit once the first motion-heavy interactions are designed
- when to adopt a dedicated media CDN or transformation pipeline
