# Google Stitch Prompt

Use this prompt in Google Stitch for early design exploration.

## Prompt

Design a responsive personal website for Yuxing Zhou.

This site is a public-facing personal brand and creative portfolio. It should function as a better-presented, more interactive front door to Yuxing's work, similar in role to GitHub but broader, more expressive, and easier to explore. The site should support personal branding and creative self-expression first, while also leaving room for future lead generation.

Do not generate a generic developer portfolio. Avoid default startup SaaS aesthetics, dashboard-like layouts, and interchangeable AI-generated landing pages.
Do not mention backend systems, auth flows, databases, APIs, admin dashboards, or implementation architecture in the generated design. Focus only on the interface, layout, content presentation, and interaction surfaces.

Context:
- Audience includes recruiters, peers, collaborators, founders, and generally curious visitors.
- The site should help someone enter through one area of interest and then discover other relevant work.
- The site includes a pervasive AI assistant that reflects Yuxing's work in AI and agents.
- The design should support rich media, future interactive content, and a mix of professional credibility and personality.

Structure:
- Top-level navigation should include:
  - Home
  - Projects
  - Writing
  - Photography
  - AI-generated media
  - About
- Projects, Writing, Photography, and AI-generated media should exist at the same navigation level.
- Projects and Writing should generally carry slightly more identity weight.
- Photography and AI-generated media should still be first-class, but slightly secondary in emphasis.

Homepage structure:
- The homepage should be a hand-curated mix of featured content from:
  - Projects
  - Writing
  - Photography
  - AI-generated media
- Do not show everything. It should feel curated.
- The homepage should feel structured but not rigid.
- It should support discovery across pillars, so a visitor can start with one interest and move naturally into others.

Homepage content presentation:
- Projects should appear as thumbnail + title + short summary.
- Writing should appear in a lighter title-led format, usually title + link.
- Photography and AI-generated media should be more visually prominent.
- Photography and AI-generated media should use larger thumbnails and varied block sizes.
- The media portion of the homepage can use a flowing editorial wall, masonry, or Pinterest-like / Red Note-like rhythm rather than a strict uniform grid.
- Even when flowy, the layout should remain readable, intentional, and easy to navigate.

Content expectations:
- Writing lives fully on-site.
- Writing pages should support rich media and future interactive embeds.
- Projects should support case-study depth.
- Photography should support image-led browsing.
- AI-generated media should support both images and videos.

AI assistant requirements:
- The assistant should feel pervasive across the experience, not buried.
- It should be visible enough that visitors understand it is part of the product.
- It should be able to chat with visitors about Yuxing and his public work.
- It should be able to help navigate visitors to relevant pages or sections.
- It may eventually support small actions and future scheduling, but those do not need to dominate the design.
- The exact UI form is intentionally open:
  - terminal-like
  - conventional chat widget
  - custom conversational surface
- The assistant should feel credible, product-quality, and integrated into the site.
- The assistant can include subtle hidden delightful behavior or easter eggs, but should not feel gimmicky.

Aesthetic direction:
- Balance minimal/editorial clarity with expressive, art-directed presentation.
- The overall feel should be:
  - intelligent
  - calm
  - modern
  - slightly bold
  - not sterile
  - not over-decorated
- Avoid locking into a single explicit visual style like brutalism, cyberpunk, glassmorphism, or ultra-luxury minimalism.
- Instead, explore layouts, hierarchy, rhythm, and spatial composition that could support multiple strong visual directions later.

Typography constraints:
- Use only two font weights across the system:
  - 400 for regular text
  - 700 for emphasis and headings
- Do not invent semibold, medium, or extra-bold steps.
- Limit the full type scale to at most 5 sizes total across the interface.
- Body text should use line-height 1.6.
- Headings should use line-height 1.1.
- Keep typography disciplined, editorial, and consistent rather than overly expressive through too many sizes or weights.

Color constraints:
- Use only:
  - 1 background color
  - 1 primary text color
  - 1 accent color
- Do not introduce additional accent families, rainbow gradients, or multiple competing brand colors.
- If visual richness is needed, get it from layout, scale, imagery, whitespace, cropping, and composition rather than extra colors.

Design priorities:
- Strong information hierarchy
- Good typography
- Clear but flexible navigation
- Visually integrated media presentation
- A homepage rhythm that mixes structured information with flowing visual content
- A convincing place for the AI assistant in the overall experience

Behavioral constraints:
- The design must work on desktop and mobile.
- The eventual site should be performant.
- Core content should not depend on heavy client-side interaction for basic presentation.
- The majority of site content should be straightforward to render as HTML and CSS.
- The assistant should not visually overwhelm browsing.

What to generate:
- Produce multiple distinct exploratory concepts, not one final answer.
- Each concept should satisfy the same product requirements but vary in:
  - homepage composition
  - navigation treatment
  - how the assistant appears in the interface
  - how editorial structure and expressive media are balanced

For each concept, emphasize:
- homepage layout logic
- how projects, writing, photography, and AI-generated media are mixed
- how the assistant coexists with the rest of the site
- how the visual system balances restraint and expression

Do not over-specify a final design system, motion language, or polish style yet. This is for concept exploration first.

## Notes

This prompt is intentionally written to follow a higher-fidelity structure:
- context
- structure
- aesthetic direction
- technical / product constraints

It is specific enough to avoid generic results, but open enough to allow real exploration.

Additional anti-slop constraints:
- exact font weight limits reduce invented typographic noise
- capped type scale reduces chaotic hierarchy
- explicit line-height values keep text readable and calm
- a tightly constrained palette prevents color drift
- excluding backend/auth/API language keeps Stitch focused on the visual problem
