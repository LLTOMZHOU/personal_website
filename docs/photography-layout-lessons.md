# Photography Layout Lessons

## Purpose

This note captures the practical lessons from debugging the photography album layout system, especially the Los Angeles regression that appeared on production after the broader cosmetics PR had already been merged.

This is not a product spec.

This is not a historical architecture journal entry.

It is a narrow engineering note for future work on album rendering, preview assets, and production debugging.

## Scope

The lessons here apply to:

- photography album page row layout
- album preview and inline image source selection
- debugging production-only layout failures where HTML structure looks correct but the rendered geometry is wrong

## The Core Lesson

The album layout algorithm and the image source pipeline are tightly coupled.

The row partitioner can be correct and the page can still render badly if the preview asset actually drawn in the browser does not match the aspect ratio metadata the renderer used to size that slot.

That exact failure happened on the Los Angeles album.

## Layout Algorithm Lessons

### 1. Optimize for rendered row height, not abstract aspect-sum targets

The older row partitioner optimized against a fixed target row aspect.

That was too indirect.

It could produce rows that were mathematically acceptable to the scorer but visually wasteful on the page.

The better model is:

- estimate row height from container width, gap, and the sum of image aspect ratios
- penalize rows that become too tall
- penalize rows that become too short
- use those penalties directly in the dynamic-programming scorer

This made the algorithm respond to the actual thing the user sees: vertical space consumption.

### 2. Singleton portraits need strong penalties

A lone portrait image is almost always the worst outcome in this layout system.

It creates a very tall visual column, expands page height, and introduces awkward whitespace around adjacent rows.

The partitioner should:

- strongly penalize singleton rows
- penalize singleton portraits even more
- especially avoid singleton portraits in non-final rows

This is more important than maintaining a neat theoretical separation between portrait and landscape content.

### 3. Mixed orientation rows are often better than isolation

The earlier scorer over-penalized rows that mixed portrait and landscape images.

That pushed the algorithm toward isolating portraits, which looked worse.

The better rule is:

- allow mixed-orientation rows
- give them only a mild penalty
- let row-height and whitespace penalties dominate the decision

For this site, a mixed row that stays compact is usually preferable to a “pure” row that creates a large hole.

### 4. Keep the row cap at three images

Four-up rows can solve some geometry problems, but they also flatten the album too aggressively and reduce the editorial feel of the page.

The current conclusion is:

- `maxPerRow = 3`
- fix compaction with better scoring, not by allowing denser rows everywhere

That preserves the visual rhythm while still avoiding the worst whitespace failures.

### 5. Rendering fallback still matters even with a better scorer

If a singleton row survives, how it is rendered still changes how bad it feels.

Useful guardrails:

- left-align singletons instead of centering them in a wide row
- cap their width more aggressively

This is secondary to the scorer, but it reduces damage in residual edge cases.

## Data And Asset Lessons

### 6. Do not trust preview aliases blindly

The Los Angeles production bug was not caused by the row algorithm.

It was caused by mismatched preview assets on the CDN:

- the canonical full image was one asset
- the `display` or `thumb` alias actually pointed at a different image

That meant:

- the renderer sized the slot using one image’s metadata
- the browser drew a different image with a different shape

So the geometry collapsed even though the row partition itself was valid.

### 7. Preview asset identity must match canonical asset identity

The renderer should only use a `display` or `thumb` asset when it clearly belongs to the same canonical image.

The simplest operational check is:

- compare the base asset id from the canonical `src`
- compare the base asset id from the preview candidate
- only trust the preview if those ids match

If they do not match, fall back to the canonical image source.

That defensive check is now part of the renderer and should remain there.

### 8. Wrong preview data can produce layout bugs, not just wrong pictures

This matters enough to state explicitly:

Preview-asset mismatches are not merely content correctness bugs.

They can also become layout bugs because the layout engine depends on width and height metadata that is assumed to describe the rendered image.

If the rendered bitmap changes but the metadata does not, the flex geometry becomes unreliable.

### 9. Hand-authored references can bypass renderer safeguards

The homepage had a hardcoded Los Angeles `cover@display.webp` reference.

Even after fixing the album renderer, that hardcoded page-level image could still point at the broken preview alias.

Lesson:

- renderer hardening is not enough
- any hand-authored image reference that bypasses the renderer can reintroduce the same class of issue

When an asset family is known to be suspect, prefer the canonical source in authored HTML or update that page explicitly.

## Debugging Lessons

### 10. Separate algorithm failures from data failures early

When an album looks broken, there are at least three plausible classes of failure:

- bad row partitioning
- bad CSS rendering behavior
- bad image source selection

The fastest way to debug is to distinguish those early instead of tweaking the scorer immediately.

The Los Angeles issue looked like an algorithm failure at first glance, but it was actually a preview-source mismatch.

### 11. Inspect deployed HTML before assuming deployment drift

The production HTML was serving the current seven-image Los Angeles sequence.

That proved the issue was not “old code still deployed.”

Checking the live HTML first removed one entire class of uncertainty.

### 12. Compare live and local screenshots, not just DOM

The most useful debugging sequence was:

1. inspect the live deployed HTML
2. capture a live screenshot with headless Chrome
3. capture a local screenshot from the same route
4. compare the actual rendered geometry

That showed:

- live production was drawing mismatched preview images
- local fallback-to-canonical rendering produced stable row geometry

Raw HTML alone did not make that difference obvious enough.

### 13. Debug image pipelines by looking at the actual assets

For the Los Angeles issue, downloading the `full`, `display`, and `thumb` assets side by side made the problem undeniable.

This should be the default approach when preview behavior looks suspicious:

- fetch the canonical image
- fetch the preview derivatives
- compare them directly
- do not assume naming conventions are truthful

### 14. Production-only layout regressions often come from data, not CSS

If one album breaks while others remain fine under the same CSS and renderer, suspect album-specific data or assets before rewriting shared layout code.

That heuristic would have shortened this investigation.

## Current Guardrails

The current system should preserve these invariants:

- album row layout is scored by estimated row height and whitespace pressure
- singleton portraits are strongly discouraged
- no more than three images appear in a row
- preview assets are only used when they match the canonical asset id
- otherwise the renderer falls back to the canonical image source

## Suggested Future Improvements

### Add richer asset validation to ingestion

The ingestion workflow should eventually verify that:

- `full`, `display`, and `thumb` derivatives all correspond to the same image
- their dimensions are consistent with the metadata written into JSON

That would catch this class of issue before it ever reaches the site.

### Add a targeted regression test for source fallback

The current smoke tests cover Los Angeles specifically.

It would be better to also test the generic rule:

- mismatched preview asset ids should fall back to the canonical source

That keeps the behavior from being tied too narrowly to one album.

### Consider storing explicit preview-source validation metadata

If asset mismatches become common, it may be worth recording a stronger repo-level invariant for gallery images instead of inferring everything from naming.

For now, filename identity checks are the pragmatic choice.

## Short Version

If a photography album layout suddenly looks broken:

1. Do not assume the row algorithm regressed.
2. Check whether the browser is rendering the same image the metadata describes.
3. Validate `display` and `thumb` assets against the canonical `src`.
4. Fall back to the canonical image if preview identity is ambiguous.
5. Only retune the scorer after ruling out asset mismatch.
