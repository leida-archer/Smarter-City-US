# SCS Design Audit — 2026-05-04

**Target:** https://leida-archer.github.io/Smarter-City-US/ (verified identical to localhost:8765 served from main @ `306bc69`)
**Mode:** Source-only (degraded) — headless browser tool unavailable in this environment, so no rendered screenshots, no runtime CSS extraction, no interaction-flow review, no perf measurement.
**Confidence:** Medium-High for items derivable from source (typography, design tokens, AI-slop in markup, a11y signals, image attrs, transition rules). Low for purely visual items (focal point, spacing rhythm, mobile design sanity, motion quality, contrast in actual paint). Visual items are **deferred**, not graded.

---

## First Impression (source-read substitute)

The site reads as **a deliberate B2B product platform, not a SaaS template**. Two-column editorial hero, named real integration partners (Banner, PeopleSoft, Workday, Genetec…), real client universities (Harvard, Princeton, Toledo) by name on a marquee, three named products (vPermit, vCompliance, vPark) with distinct accent colors instead of identical-looking icon cards. Not a 3-column-features-with-circle-icons site — that is the single biggest tell against AI slop and it is absent here.

The Light Editorial aesthetic is committed to: thin display headings (300 weight), letter-spacing -2.5px on h1, Inter body at 17px / 1.7 line-height, frosted-glass nav, signature 7-color rainbow bar, restrained teal palette with semantic product accents (green/orange/amber). One word: **considered.**

---

## Inferred Design System (extracted from `styles.css`)

| | |
|---|---|
| **Heading font** | DM Sans (300, 500 weights), letter-spacing -2.5px on h1 |
| **Body font** | Inter (300, 400, 500, 600) at 17px / 1.7 line-height |
| **Accent serif** | Georgia italic (`.serif-accent`) |
| **Color tokens** | 25 distinct hex values. Teal family (#15626C, #2C7480, #3194B6, #47BBE8). Product accents: vPermit green #4DAE37, vCompliance orange #EB5B25, vPark amber #F0AE25. CTA red #D41B24. Neutrals: #0F172A, #475569, #64748B, #F8FAFC, #FAFAF8. |
| **Border-radius** | 1, 2, 6, 8, 10, 12, 14, 16, 20px, 50% — **8 distinct sizes**, no clear hierarchy |
| **Section padding** | 120px (`--section-pad`) |
| **Container** | max 1200px / wide 1400px, 32px / 48px gutters |
| **Breakpoints** | 480, 767, 880, 1024 — no wide breakpoint at 1440+ |
| **Animations** | Reveal fade+rise (cubic-bezier(0.16, 1, 0.3, 1)), 7 instances of `transition: all 0.2s` |

---

## Findings

### HIGH impact (4)

**FINDING-001 — Accessibility · No `prefers-reduced-motion` handling**
Site has page-load `reveal` animations on virtually every section, an infinite-scrolling logo marquee, hover transforms on cards, and gradient testimonials. Zero `@media (prefers-reduced-motion: reduce)` declarations across all CSS files (`styles.css`, `assets/themed-select.css`, `resources/scs-calculator-v2.css`, `resources/scs-calculator.css`).
Users with vestibular disorders or who have set the OS preference get full motion. WCAG 2.1 SC 2.3.3.
**Fix:** add a `@media (prefers-reduced-motion: reduce)` block that sets `.reveal { opacity: 1; transform: none; transition: none; }`, halts the marquee animation, and zeros out hover transforms.

**FINDING-002 — Accessibility · No `:focus-visible` ring on buttons or links**
Searched all CSS files for `:focus-visible` — only **one** match, in `resources/scs-calculator-v2.css:28` for a `.btn-text` variant. Nav links, dropdowns, `.btn-primary`, `.btn-text`, `.product-link`, mobile menu items, hamburger, the entire pricing-calculator gating overlay's CTAs — none have a visible focus state. WCAG 2.1 SC 2.4.7 (Focus Visible) fails.
**Fix:** add a global rule `:where(a, button, [role="button"], [tabindex]):focus-visible { outline: 2px solid var(--mid-teal); outline-offset: 2px; }`.

**FINDING-003 — Accessibility · No "skip to main content" link**
`grep -rE 'skip.*main|skip-link|skip-nav' --include="*.html"` → 0 matches. Keyboard users must tab through every nav item (8+ items, dropdowns expand more) on every page before reaching the hero. WCAG 2.4.1.
**Fix:** add `<a href="#main" class="skip-link">Skip to main content</a>` as the first child of `<body>` on every page; style as visually-hidden until `:focus`. Add `id="main"` to the first `<section>` after the nav.

**FINDING-004 — Responsive · 5 internal preview pages missing `<meta viewport>`**
`resources/mlpr-align-preview.html`, `resources/prorated-preview.html`, `resources/grand-col-preview.html`, `resources/mlpr-preview.html`, `resources/mlpr-logo-size-preview.html`. These render at desktop sizing on mobile (no responsive scaling). Lower public-facing severity since they're not linked from nav, but they're still served and indexable.
**Fix:** either delete (if dev scratch) or add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to each.

---

### MEDIUM impact (5)

**FINDING-005 — Motion · `transition: all` anti-pattern (7 occurrences)**
`styles.css:153, 177, 193, 264, 338, 1795` and `resources/scs-calculator.css:1246`. Animating "all" properties triggers paints/layouts on properties you didn't intend. Per the design-review checklist: only `transform` and `opacity` should animate.
**Fix:** replace each with explicit property lists, e.g. `transition: transform 0.2s, color 0.2s` or `transition: background 0.2s, border-color 0.2s` depending on what should actually animate.

**FINDING-006 — Hierarchy · Heading level skipped (h2 → h4) in "Why universities choose SCS"**
[index.html:306-340](index.html#L306-L340) — section h2 followed directly by 6 `<h4>` value-item titles, no h3 between them. Same pattern on industry pages: [industries/k12.html](industries/k12.html), [industries/healthcare.html](industries/healthcare.html). Disorients screen-reader heading nav (rotor jumps levels).
**Fix:** demote the value-item `<h4>` to `<h3>` (they're the only children of the section, so they're at level 3 in the page hierarchy). Or restructure so an h3 appears between.

**FINDING-007 — Design system · Border-radius lacks hierarchy**
Eight distinct values used: 1, 2, 6, 8, 10, 12, 14, 16, 20px, plus 50% for circles. No naming convention. Per the design-review skill's spec: hierarchical scale (sm:4px, md:8px, lg:12px, xl:16px, full:9999px). Current pattern is one-off-per-component.
**Fix:** introduce CSS custom properties (`--radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 20px; --radius-full: 9999px`) and replace inline values. Audit fix can be staged.

**FINDING-008 — Performance · 96% of images missing `loading="lazy"`**
4 of 190 `<img>` tags have `loading="lazy"`. The hero image and any LCP-candidate images SHOULD be eager (correct), but everything below the fold (testimonial avatars, partner logos, university logos in marquee, illustrations on industry pages) should be lazy.
**Fix:** add `loading="lazy"` to all images that aren't above the fold. Keep the hero image as eager.

**FINDING-009 — Code quality · Dead CSS rule**
[styles.css:1459](styles.css#L1459) targets `.value-card { padding: 28px 24px; }` inside the mobile breakpoint — the actual class is `.value-item` (declared at line 670). The rule never applies.
**Fix:** rename to `.value-item` or delete.

---

### POLISH (5)

**FINDING-010 — Typography · Straight quotes / contractions instead of curly**
Homepage has 10 instances of straight ASCII apostrophes (`it's`, `don't`, `we've`). Curly typography (`'`, `'`, `"`, `"`) is one of the cheapest design polish wins.
**Fix:** find/replace `\b([a-z])'([a-z])\b` → `$1'$2` across HTML files; quote pairs to `"` / `"`.

**FINDING-011 — Typography · 3-dot ellipsis instead of single character**
Homepage has 2 instances of `...` (three dots). Should be `…` (U+2026). Most visible in hero "Continue…" / loading text patterns.
**Fix:** find/replace `...` → `…` (be careful in JS files / code blocks where it's syntactic).

**FINDING-012 — Typography · No `text-wrap: balance` on display headings**
h1/h2 use `clamp(...)` for fluid sizing — at intermediate viewports headings can wrap into orphans or unbalanced lines. Modern CSS supports `text-wrap: balance` for headings, `text-wrap: pretty` for body.
**Fix:** in `styles.css` near line 56, add `h1, h2, h3 { text-wrap: balance; } p { text-wrap: pretty; }`.

**FINDING-013 — Typography · No measure cap on body text**
Container is 1200px max-width. Body `<p>` elements within wide single-column sections can extend to that width — well past the 75ch readable measure. Most-visible on the integration story and switching-section copy.
**Fix:** add `.hero-content p, .switching-content p, .integration-content p { max-width: 65ch; }` or similar scoped rule.

**FINDING-014 — Responsive · No 1440+ breakpoint**
Highest declared breakpoint is `@media (max-width: 1024px)`. On ultra-wide displays (1920+) the design stays at desktop-medium proportions. Likely no real bug, just a missed opportunity for richer layout on wide screens.
**Fix:** consider `@media (min-width: 1440px)` to widen `.container` or scale type up via `clamp()` ceilings (some headings already use clamp ceilings — extend that).

---

### Deferred — visual-only (cannot grade source-only)

These need rendered pixels to evaluate. Re-run `/design-review` once browse is healthy to grade:
- Visual hierarchy (focal point, eye flow, squint test)
- Spacing rhythm across sections
- Hover / active / disabled state visuals
- Empty state quality
- Loading skeleton quality
- Mobile layout sanity (does mobile design make *sense* or is it just stacked desktop)
- Motion quality, FOUT visibility
- Color contrast in actual paint (WCAG AA verification)
- Cross-page component consistency
- Performance (LCP, CLS, font-swap flash)

---

## Scoring (with source-only caveat)

| Category | Grade | Notes |
|---|---|---|
| Visual Hierarchy | — | Cannot grade source-only |
| Typography | **B** | Strong fundamentals (DM Sans + Inter, 17px/1.7, scale present); −1 for straight quotes, no balance, no measure cap. Inter is on the design-review "overused" list but is a deliberate brand standard so I won't penalize. |
| Color & Contrast | **B+** | Palette tokenized and coherent, 25 hex values reasonable; runtime contrast unverified |
| Spacing & Layout | **C+** | Grid system + breakpoints exist, but border-radius lacks hierarchy, no measure cap, no 1440 breakpoint |
| Interaction States | **D** | No `:focus-visible`, `transition: all` anti-pattern. Hover/active/disabled visuals not verified |
| Responsive | **B−** | Three breakpoints + mobile menu present, but 5 preview pages broken |
| Motion | **D** | No `prefers-reduced-motion`, `transition: all` anti-pattern |
| Content Quality | **B+** | Specific named copy (universities, integration partners), real testimonials; −0.5 for straight quotes/dots |
| **AI Slop** | **A−** | Two-column hero, named partners, distinct product accents, real numbered cards, real testimonials. Not a SaaS template feel. |
| Performance | — | Cannot grade source-only |
| **Accessibility** | **D** | No focus rings, no skip link, no reduced motion, only 1 aria-label on the homepage |

**Overall Design Score: B−** *(estimate, source-only)*
**AI Slop Score: A−**

---

## Quick Wins (3–5 highest-impact fixes, <30 min each)

1. **Add global `:focus-visible` ring** (FINDING-002) — single CSS rule, fixes WCAG keyboard nav across the entire site. ~10 min. (human team: ~1 hour, CC: ~10 min)
2. **Add `prefers-reduced-motion` media query** (FINDING-001) — single block in `styles.css`, halts reveal/marquee/hover transforms. ~15 min. (human: ~2 hours, CC: ~15 min)
3. **Curly quotes + ellipsis sweep** (FINDING-010, FINDING-011) — find/replace in HTML files. ~10 min. (human: ~1 hour, CC: ~10 min)
4. **Add skip-to-main-content link** (FINDING-003) — one global include + per-page `id="main"`. ~20 min. (human: ~2 hours, CC: ~20 min)
5. **`text-wrap: balance` on headings + `max-width: 65ch` on body sections** (FINDING-012, FINDING-013) — 2 CSS lines. ~5 min. (human: ~30 min, CC: ~5 min)

Combined: ~1 hour CC time, lifts Accessibility D → B and Typography B → A−.

---

## Localhost vs Live — Match Confirmation

Verified zero diff between `http://localhost:8765/` (served from `main @ 306bc69`) and `https://leida-archer.github.io/Smarter-City-US/` for:
- `/` (home)
- `/resources/pricing.html`
- `/industries/k12.html`
- `/industries/healthcare.html`
- `/resources/sales-deck.html`
- `/account/sourcewell-login.html`

The local copy is a faithful mirror of the live site; findings against either apply equally to both.

---

## Methodology Caveats

This is a **source-only audit**. Phase 1 (First Impression with screenshot), Phase 2 (Design System Extraction via runtime `getComputedStyle`), Phase 3 (page-by-page screenshot annotation), Phase 4 (interaction-flow snapshot diffing), Phase 5 (cross-page screenshot consistency), Phase 8 fix-loop with before/after screenshots, and Phase 10 performance metrics — all skipped because the headless browser tool is killed by the OS sandbox on every navigation.

Re-running this skill from an environment where browse is healthy would catch:
- Pixel-level spacing/alignment issues invisible in source
- Real color contrast values
- Mobile design sanity (vs stacked desktop)
- Motion quality and timing
- Performance (LCP, CLS, FOUT)
- Hover/active/loading state visuals

The findings above are robust to source — they don't depend on rendering.
