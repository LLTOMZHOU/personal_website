# Website Specification

## Document Status

- Status: Draft
- Intended audience: product, design, engineering, AI coding agents, AI design agents
- Purpose: define what the website is, what it must do, how it should behave, and the constraints it must satisfy

## Product Summary

This project is a personal website for Yuxing Zhou.

At a high level, the website should present identity, work, writing, and visual taste in a way that is credible, memorable, and easy to maintain over time.

The site should work both as:

- a public-facing portfolio / personal brand site
- a lightweight publishing surface for project writeups and writing
- a design-forward artifact that reflects taste, not just information
- a demonstration surface for AI/agent work through an interactive chat experience
- a media surface for photography and AI-generated visual work
- potentially a centralized front face for various other github projects presenting the preview and iteractables instead of just dry links to repo.


## Primary Goals

- Communicate who Yuxing is within a few seconds of first visit.
- Showcase selected projects with enough depth to establish credibility.
- Support writing and thought pieces without requiring a full CMS from day one.
- Support photography or image-led content as a first-class section, not an afterthought.
- Support photography as a major part of the site, not a side section.
- Support AI-generated media content, including images and video.
- Be easy to update and extend over time.
- Feel intentional and distinctive rather than generic portfolio boilerplate.
- Present AI/agent expertise in an interactive way, not only through static copy.
- Collect enough site analytics and observability data to support later iteration and improvement.
- Support personal branding and creative expression as primary product outcomes.
- Give visitors a path from one area of interest into the broader body of work.
- Act as a better-presented, more interactive front door to Yuxing's public work, similar in role to GitHub but broader and more expressive.

## Non-Goals

- Not a large social network or community platform.
- Not an ecommerce product.
- Not a complex multi-user web app.
- Not dependent on a heavy back-office CMS on day one unless clearly justified.

## Target Audiences

### Primary

- Recruiters and hiring managers
- Collaborators and peers
- Founders, clients, or potential partners

### Secondary

- Friends, classmates, and general visitors
- Readers discovering writing or project work
- People browsing photography or visual work

## Core User Jobs

- Understand who Yuxing is and what he works on.
- Quickly scan featured projects.
- Open a project page and understand the problem, process, and outcome.
- Browse writing.
- Browse photography or visual work.
- Find contact links and external profiles.
- Interact with an on-site assistant that can answer questions about Yuxing, his work, and public project context.
- Generate measurable usage data so site performance and content decisions can be improved over time.

## Site Map

### Required Pages / Sections

- Home
- Projects index
- Project detail page template
- Photography index
- Photography album or gallery detail template
- AI-generated media index
- AI-generated media detail or gallery template
- Writing index
- Writing detail page template or external-link listing
- About
- Contact / outbound links

### Optional Future Pages

- Resume / CV
- Uses / tools
- Now page
- Speaking / talks
- Press / features

### Cross-Site Interactive Features

- AI chat / assistant experience

### Information Architecture Rule

The following content pillars should exist at the same hierarchy level in the primary navigation and overall product structure:

- Projects
- Photography
- AI-generated media
- Writing

Within the overall brand emphasis:

- Projects and writing should generally carry more weight as identity-defining pillars.
- Photography and AI-generated media should remain first-class in navigation and product structure, but can be secondary in emphasis relative to projects and writing.

## Content Model

### Home

Must answer:

- who is this person
- what do they do
- what are the most important things to click next

Suggested content blocks:

- hero
- short positioning statement
- hand-curated featured projects
- hand-curated featured writing
- hand-curated featured photography
- hand-curated featured AI-generated media
- optional AI chat entry point
- optional visual teaser
- contact / social links

### Homepage Curation Model

- The homepage should contain a hand-curated mix of content from the four primary pillars.
- The homepage should not attempt to show everything.
- Featured content selection should be easy to control manually.
- The homepage should balance structure with a more flowing browsing experience.
- The homepage should feel curated and alive rather than rigidly grid-based.
- The homepage should help visitors enter through one interest area and then discover other kinds of work.

### Homepage Presentation Rules

- Projects should be presented with:
  - a thumbnail
  - a title
  - a short summary
- Writing should be presented more lightly, typically with:
  - a title
  - a link
- Photography and AI-generated media should be more visually prominent.
- Photography and AI-generated media can use larger thumbnails and more varied card sizes.
- The media presentation can feel closer to an editorial wall, Pinterest-like flow, or Red Note-style visual stream than a rigid card grid.
- Even with a flow-like layout, the page must remain readable and navigable.

### Project

Each project entry should be able to contain:

- title
- short summary
- date or date range
- role
- collaborators
- external links
- cover image or media
- overview
- problem / goal
- process
- technical details
- outcomes / lessons

### AI Assistant

The AI assistant should be able to use a curated set of public site content and profile context to answer questions about:

- who Yuxing is
- what he has built
- what he writes about
- selected project details
- selected interests or areas of expertise

The assistant should not be assumed to have access to private or sensitive personal data unless explicitly designed for that later.
The assistant should be considered a pervasive part of the site experience rather than an isolated demo.
The assistant may retain chat context locally within the user's browser session or local client storage, but that conversational memory should not require backend persistence.

### Writing

Each writing entry should be able to contain:

- title
- subtitle or summary
- publish date
- tags
- body content
- external canonical link if applicable
- optional rich media
- optional interactive embedded content

Writing should primarily live fully on-site, while also supporting outbound links or canonical references to other publishing platforms.

### Photography

Each photography entry or album should be able to contain:

- album title
- cover image
- short description
- image set
- optional location / date metadata

### AI-Generated Media

Each AI-generated media entry or collection should be able to contain:

- title
- cover image or thumbnail
- short description
- media type such as image, video, or mixed
- media assets
- optional prompt/process notes
- optional tools / models used
- optional date metadata
- optional tags or series grouping

## Functional Requirements

### Navigation

- Global navigation must make core sections easy to find.
- Navigation must work well on desktop and mobile.
- Current section should be visually clear.
- Internal navigation should feel fast and predictable.

### Home Page

- Must present a clear identity statement above the fold.
- Must surface featured work.
- Must provide clear next actions.
- Must not feel crowded or resume-like.
- Must present a curated mix of projects, writing, photography, and AI-generated media.
- Must feel structured without becoming rigid.
- Must support a more flowing visual treatment for media-heavy content.
- Must support discovery across pillars so that a visitor entering from one interest area can find other relevant work.

### Projects

- Must support an index of projects.
- Must support detail pages with rich text and media.
- Must make it easy to compare projects at a glance.
- Must support both short entries and deep case studies.

### Writing

- Must support an index of posts or essays.
- Must support fully native on-site posts as the primary model.
- Must support outbound or canonical links to other platforms where relevant.
- Typography must be good enough for serious reading.
- Writing pages should be able to include richer media and future interactive content.

### Photography

- Must support image-led browsing.
- Must preserve visual quality while keeping performance acceptable.
- Must be usable even if the photography section launches in a limited form.

### AI-Generated Media

- Must support a dedicated section for AI-generated creative work.
- Must support both images and videos.
- Must make clear that the content is AI-generated when appropriate.
- Must allow this section to feel curated and intentional rather than like a dump of experiments.
- Must support either individual detail pages, gallery views, or both.

### About / Contact

- Must contain accurate bio information.
- Must include outbound links such as GitHub, LinkedIn, email, or equivalent.
- Must make contacting Yuxing straightforward.

### Content Authoring

- New pages or entries should be straightforward to add.
- The content workflow should not require a CMS or admin panel.
- Content should ideally be stored in a format that is versionable and AI-friendly.
- Public content should be structured in a way that can also support retrieval or grounding for the AI assistant.
- The preferred operating model is direct code and content editing in-repo, potentially assisted by AI.
- The system should be optimized for a single-owner workflow rather than team collaboration.
- Content pages should be able to remain mostly straightforward HTML and CSS at render time.
- The site should not depend on heavy client-side interactivity for core content presentation.

### AI Assistant / Chat

- The site should support an interactive assistant experience.
- The assistant should answer questions about Yuxing and the public contents of the site.
- The assistant should function as both:
  - a useful visitor tool
  - a proof point that Yuxing works on AI / agents
- The assistant should be treated as a pervasive product layer across the site.
- The visual presentation of the assistant is intentionally undecided at this stage.
- The assistant may ultimately appear as:
  - a terminal-like interface
  - a conventional chat widget
  - a more custom conversational surface
- The assistant should be grounded in curated public data, not generic unguided conversation.
- The assistant should avoid fabricating facts about Yuxing or his work.
- The assistant should have clear scope boundaries when it does not know an answer.
- The assistant should be able to direct users toward relevant pages or projects when appropriate.
- The assistant should be able to help users navigate the site through conversational actions.
- The assistant should be able to trigger small product actions where appropriate.
- The assistant should not feel gimmicky or disconnected from the rest of the site.
- The assistant should include delightful behavior, hidden interactions, or Easter eggs that reward exploration.
- Those Easter eggs should feel intentional and on-brand rather than random.
- Conversational continuity may be stored locally in the browser rather than on the backend.
- Assistant-side local memory should be scoped to the user and should not create broader backend retention requirements.

### Assistant Capabilities

At minimum, the assistant should be able to:

- chat with the user about Yuxing and the site
- answer questions grounded in public profile and project information
- suggest and redirect users to relevant pages or sections
- support small site actions through conversation where appropriate

Potential higher-value actions include:

- navigating to a project, writing entry, photo section, or AI-generated media section
- surfacing relevant links based on intent
- helping a user discover relevant content conversationally
- supporting appointment booking if that workflow is enabled

### Assistant Booking Requirement

- The product should allow for the possibility that the assistant can help book appointments with Yuxing.
- This does not require immediate implementation, but the requirement should be preserved in the product definition.
- If booking is enabled, the workflow should feel native to the assistant experience.
- Booking should only happen through an explicit and trustworthy interaction flow.

### Observability / Analytics

- The site should capture basic usage analytics.
- Analytics should make it possible to understand:
  - page views
  - overall traffic
  - relative popularity of pages or sections
  - referral sources where available
  - broad visitor geography or demographic proxies where available
  - engagement patterns such as which sections are clicked most
  - click-through behavior and conversions where applicable
  - session quality, including a useful approximation of active session time
- The assistant feature should have basic interaction analytics, such as:
  - assistant opens
  - conversation starts
  - suggested link clicks
  - high-level usage frequency
- The assistant may send analytics and usage signals back to the analytics system even if conversational memory itself stays local-only.
- The analytics approach should be useful for product iteration, not just vanity metrics.
- The analytics setup should remain lightweight and should not materially degrade site performance.
- The analytics setup should be privacy-conscious and avoid unnecessary user tracking.
- The site should support future analysis of what content or navigation patterns perform best.
- The analytics approach can be product-style and event-rich as long as it remains within a zero-cost / free-tier constraint.
- The observability stack should be selected or designed so the site can remain free to operate.

## Behavioral Requirements

- The website should feel fast on first load.
- Page transitions, if present, should be subtle and purposeful.
- Motion should support the visual system, not distract from content.
- Layout should remain stable as content loads.
- Images should load progressively or gracefully where possible.
- Media-heavy sections should still feel smooth and navigable.
- The design should adapt cleanly across mobile, tablet, and desktop.
- If the assistant is present globally, it should not disrupt browsing or obscure primary content.
- If the assistant is interactive on load, its behavior should remain predictable and non-intrusive.
- Key user interactions should be measurable in a way that supports future product and design decisions.
- The homepage should feel structured but not rigid.
- Media-heavy areas should feel visually flowing without becoming chaotic.
- The assistant should feel available throughout the experience, not buried or hard to discover.
- The visual system should balance minimal/editorial clarity with a more expressive art-directed feel.

## Non-Functional Requirements

### Performance

- Good first-load performance on typical mobile and laptop connections.
- Strong Core Web Vitals target, especially for the home page and any image-heavy pages.
- Avoid shipping unnecessary client-side JavaScript.
- The assistant feature should not impose disproportionate bundle or runtime cost on users who do not engage with it.
- Observability tooling should be lightweight and should not create avoidable performance regressions.
- Media delivery for photography and AI-generated content should be optimized for bandwidth and caching.
- The majority of site content should be deliverable as straightforward HTML and CSS without depending on substantial client-side runtime.

### Accessibility

- Semantic HTML and keyboard navigability.
- Sufficient color contrast.
- Accessible names for interactive elements.
- Images should have appropriate alt text where meaningful.
- The assistant UI must be keyboard accessible and screen-reader legible.
- Video and image galleries should remain accessible and navigable.

### SEO

- Meaningful page titles and descriptions.
- Good metadata for project and writing pages.
- Clean URLs.
- Reasonable social preview support.

### Maintainability

- The site should be easy to evolve over time.
- Structure should support adding new sections without major rewrites.
- Content and presentation should be reasonably separable.
- The site should remain simple enough that AI can reliably update and maintain it directly.

### Reliability

- Pages should render consistently in production.
- Broken links and missing content states should be handled gracefully.
- If the assistant is unavailable or degraded, the rest of the site must still work normally.
- If analytics or observability tooling fails, the site must still function normally.

## Design Direction

This website should not look like a default template or an interchangeable developer portfolio.

Design principles:

- editorial clarity over dashboard density
- strong typography
- restrained but intentional motion
- distinctive visual identity
- image support that feels integrated, not bolted on
- strong media presentation for photography and AI-generated work
- balance between professionalism and personality
- AI interactivity that feels credible and product-quality rather than decorative
- a homepage rhythm that mixes structured information with flowing visual content

## Visual Tone

To be refined with final direction, but likely somewhere in this space:

- intelligent
- calm
- modern
- slightly bold
- not sterile
- not over-decorated
- balanced between editorial restraint and expressive presentation

## Constraints

- The final stack is not yet locked.
- The design system should not depend on a single framework-specific assumption.
- The spec should remain usable by both engineering and design-generation tools.
- The assistant experience should be designed so that its UI shell can evolve without changing the core product intent.
- Observability should be designed so that analytics providers can be swapped without redefining product requirements.
- The solution should remain free to operate, whether through free tiers or self-managed no-cost approaches.

## Open Questions

- Should assistant-driven booking be present at launch or designed for a later phase?
- How playful should the assistant be relative to its professional role?

## Inputs Needed From Yuxing

Please provide:

- positioning statement or how you want to be described
- the top 3 to 6 projects that matter most
- design references you like or dislike
- any hard requirements for hosting, cost, performance, or tooling
- how prominent the AI assistant should be
- what knowledge sources the AI assistant should be allowed to use
- what level of analytics and privacy posture you want
- whether booking should be available at launch
- how playful or weird the assistant is allowed to be

## Success Criteria

The website is successful if:

- a first-time visitor can understand who Yuxing is quickly
- the featured work feels credible and memorable
- the site is pleasant to browse on both desktop and mobile
- adding or updating content is low-friction
- content updates can be made directly in code or content files without a CMS
- the visual design feels distinctly intentional
- the AI assistant feels useful, grounded, and aligned with Yuxing’s identity and expertise
- site analytics are sufficient to identify popular content, traffic patterns, and areas for improvement
- photography and AI-generated media feel like intentional parts of the brand and browsing experience
