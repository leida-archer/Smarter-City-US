# SCS Web Demo — Project Status

**Snapshot date:** 2026-04-16
**Repo path:** `/Users/archer/Desktop/Private Consulting/SCS/SCS Website & Research/SCS-Web-Demo/`

---

## Project overview

Static marketing + pricing-calculator site for Smarter City Solutions (SCS). ~27 pages across `index.html`, `about/`, `account/`, `contact/`, `industries/`, `resources/`, `solutions/`. Served locally with `python3 -m http.server`. No build step; pure HTML + CSS + vanilla JS.

The interactive **pricing calculator** at `resources/pricing.html` is the main recent focus. It has:

- Entity toggle (Campus / Municipality)
- Contract Pricing toggle (Sourcewell 10% / Standard)
- Dynamic software module + tier selection
- Hardware picker (tablets, LPR devices, wireless printer)
- Mobile LPR (Survision PlatEnforce) expandable card
- Live Software and Hardware Estimate cards (right column)
- "Complete Deployment Estimate" grand-total card at the bottom
- PDF export via jsPDF (client-side, `resources/scs-calculator-pdf.js`)

---

## Key files (current state)

| File | Role |
|---|---|
| `resources/pricing.html` | Main calculator page; single-page UI + inline gating overlay |
| `resources/scs-calculator.js` | Calculator state, compute, render, event binding |
| `resources/scs-calculator.css` | Calculator-specific styles |
| `resources/scs-calculator-pdf.js` | jsPDF-based PDF generator |
| `assets/nav-auth.js` | **Shared** logged-in-state nav button swapper (loaded on all 27 pages) |
| `assets/themed-select.js` / `.css` | **Shared** themed `<select>` upgrade for `.themed-select` inputs |
| `assets/sourcewell-logo.png` | Sourcewell wordmark (599×102, 6px transparent padding below letters) |
| `assets/survision-logo-2025.png` | Survision wordmark (1000×143) used in MLPR card title |

---

## Recent work (in rough order)

### Pricing calculator — core

- Campus: Sourcewell 10% off applies to subscription **and** extra integrations. Integration unit price hint updates ($3,750 → $3,375 when active).
- Campus prorated-to-N-months rendered as an indented **subline** under the subscription (arrow prefix, muted gray, negative amount). Subline hidden when go-live month is July (fiscal-year start).
- Municipal: removed bogus "65% discount" interpretation. Implementation fee = 65% of selected module base subs (negotiated; not automated). vPark fee = 5% × avgTxn + $0.35 flat. Sourcewell 10% reduces flat fee only ($0.35 → $0.315).
- Annual-based inputs everywhere (`annualPermits`, `annualCitations`, `annualTransactions`). Tier breakpoints scaled to annual.
- Hardware prices baked in at 10% discount (`$4,050 / $2,160 / $675`). Labels generic: `Handheld Enforcement Tablet`, `Handheld LPR Citation Device`, `Wireless Printer`.
- Mobile LPR: tier renamed `SCS` → `MSRP`, `SCS Partner` → `Sourcewell`. Title uses Survision wordmark inline ("Add [logo] Mobile LPR" at 14px, shifted up 1px for center-alignment with icon). Volume-discount dropdown removed; hint "Volume discounts are subject to negotiation with Survision" under Payment Model.

### Deployment Estimate (grand total)

- Subtitle now shows only active components: `Software · Hardware · Mobile LPR` (conditional).
- Hardware column hides when no devices + MLPR off.
- Year 1 Total label drops "(Prorated)" when go-live month is July.
- Total Cost of Ownership strip removed.
- Grand-total card uses neutral 1px border + soft shadow (matches summary cards).
- Section between Hardware and Grand Total now has `fade-up` gradient divider matching the hero → software divider; `fade-glow` variant (beige → white → beige) also exists but unused after switching grand-total section to white background.
- New arrow bars: "Start building your deployment" (hero → software), existing "Continue building your deployment" (sw → hw), new "See your deployment estimate" (hw → grand).

### Animation sync pass

- Introduced `:root` tokens `--anim-duration: 300ms`, `--anim-fade-half: 150ms`, `--anim-ease: cubic-bezier(0.4,0,0.2,1)`.
- Unified all interactive transitions (toggle-card, checkbox-card, mlpr-card-expand, segmented-btn, summary-body opacity fades) to the tokens.
- `fadeValue` / `fadeHTML` rewritten: phase-locked swap via `transitionend` + `requestAnimationFrame` chain with a 260ms safety fallback.
- `render()` coalesces multiple state changes in the same frame via rAF.
- **Summary lines converted to double-buffered cross-fade** (`.summary-lines-stack` with two `.summary-lines-layer` children) to eliminate the "first-two-letters flash" on Sourcewell toggle — position-stable glyphs can no longer carry across a DOM swap.

### PDF export (`scs-calculator-pdf.js`)

- Config line: `Campus / Municipality  ·  …  ·  [Sourcewell logo]  (10% Discount)`. Logo is measured against PNG alpha: shifted down by `logoHeight × (6/102)` so letter-bottom lands on text baseline. Suffix in gray 7pt.
- Line items: indented sublines/subitems render with `-` ASCII prefix (Helvetica WinAnsi has no `↳` glyph; earlier Unicode broke `getTextWidth`). Credit amounts use ASCII `-$X`; em-dash replaced by `-`; empty notes skip the `( )` wrapper.
- Software and Hardware totals boxes both 12mm tall with vertically-centered label + amount. "Annual Recurring" moved below the teal software box in gray, mirroring "MLPR recurring" below the orange hardware box.
- Dynamic line-height: computes `lineH = clamp(available / totalLines, 4.2, 6)` so the whole report fits on one page.
- Grand-total block anchored at `PAGE_H - FOOTER_H - GRAND_BLOCK_H`. Annual Recurring moved below the big Year 1 amount and rendered in italic 12pt.
- **Professional Services block** (gray, 88×~25mm) in the bottom-right, spanning from cap-top of "TOTAL YEAR 1 INVESTMENT" to baseline of italic Annual Recurring. Contains header, `$215/hr` row, and SOW description.
- "Confidential" removed from footer; both footer lines horizontally centered.
- Device labels rename and `(one-time)` stripped from physical hardware rows; MLPR Software/Commissioning keep their notes.

### Auth / nav

- Shared `/assets/nav-auth.js` handles logged-in state across all 27 pages. When `localStorage.scs_authed === 'true'`, it swaps only the inner content of the `.nav-cta` Sourcewell button (`<img>` → `{username} + logout icon`). No style overrides — the existing class + inline styles preserve the original size, teal border, and position pixel-identically.
- Exposes `window.SCSNavAuth.refresh()` for post-login re-run from gated pages.
- Duplicated inline nav-swap code removed from `pricing`, `newsletter`, `tier-sheets`, `sales-deck`.
- Console log `[nav-auth] loaded, authed= …` for DevTools debugging.

### Themed dropdowns

- Extracted to `/assets/themed-select.css` + `/assets/themed-select.js`.
- Any `<select class="themed-select">` upgrades to the themed UI on load (`window.ThemedSelect.init()` / `.syncValue(el)` for programmatic updates).
- Applied to `campusTier`, `goLiveMonth`, the 2 CTA-form selects on pricing, and `referral_source` on `contact/request-demo.html`.

---

## Known / open items

- **Browser cache:** after nav-auth.js work, pages opened before the fix need a one-time hard refresh (Cmd+Shift+R) to pick up the new `<script>` tag.
- **Mobile LPR volume discount:** neutralized `autoMlprDiscount()` to always set `state.mlprDiscount = 0` — green volume-discount line can no longer appear in the hardware estimate.
- **Professional Services** block exists on the PDF but is intentionally hidden from the live UI (`display:none` wrapper in `pricing.html`).
- **`.fade-glow` CSS variant** unused in production after grand-total section switched to white background; safe to keep or remove.

---

## Run locally

```
cd "~/Desktop/Private Consulting/SCS/SCS Website & Research/SCS-Web-Demo"
python3 -m http.server 8091
```

- Calculator: [http://localhost:8091/resources/pricing.html](http://localhost:8091/resources/pricing.html)
- Home: [http://localhost:8091/](http://localhost:8091/)
- Sample PDF generator (dev): `/tmp/pdf-preview/generate.js` — writes `~/Desktop/SCS-PDF-Preview.pdf`

---

## Demo credentials

Gated pages (pricing, newsletter, tier-sheets, sales-deck) accept:
- Email: `demo`
- Account #: `0000`
