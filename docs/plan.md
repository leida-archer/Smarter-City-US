# SCS USA Website — Light Editorial Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, multi-page static mockup of the SCS USA website using the Light Editorial design direction, populated with all real content from the Original mockup and design guide.

**Architecture:** Static HTML/CSS/JS site. Each page is a standalone `.html` file sharing a common external stylesheet (`styles.css`) and script (`script.js`). Light Editorial's inline styles will be extracted to the shared stylesheet. All pages share a consistent nav, footer, and utility bar. No build tools or frameworks — pure static files served via `python3 -m http.server`.

**Tech Stack:** HTML5, CSS3 (custom properties, grid, clamp), vanilla JS (IntersectionObserver, smooth scroll), Google Fonts (DM Sans + Inter)

**Notes:**
- All forms are HTML mockups only — HubSpot form integration is deferred to production build
- Footer links for Privacy Policy, Accessibility Statement, and Careers are placeholder (`#`) — no backing pages
- Social media links in footer are placeholder (`#`) per design guide spec
- Company history timeline (CellOPark 2008 → SCS 2018) is from competitor analysis — should be verified with SCS before production
- Analytics (GA4, Clarity, HubSpot tracking) deferred to production build

**Working directory:** `/Users/archer/Desktop/SCS/SCS Website Research/scs-usa-mockup/`

**Serve locally:** `cd "/Users/archer/Desktop/SCS/SCS Website Research/scs-usa-mockup" && python3 -m http.server 8091`

---

## File Structure

```
scs-usa-mockup/
├── index.html                  ← Homepage (Light Editorial + Original content merged)
├── styles.css                  ← Shared stylesheet (extracted from Light Editorial inline)
├── script.js                   ← Shared interactions (nav, scroll, observers, counters)
├── solutions/
│   ├── vpermit.html            ← Virtual Permit Management
│   ├── vcompliance.html        ← Enforcement & Citation Management
│   ├── vpark.html              ← Mobile Payments
│   ├── platform.html           ← The Integrated Platform
│   └── integrations.html       ← Partner Ecosystem
├── industries/
│   ├── higher-education.html   ← Primary landing page
│   ├── municipalities.html     ← Secondary market
│   ├── healthcare.html         ← Emerging market
│   └── k12.html                ← Emerging market
├── about/
│   ├── index.html              ← Our Story
│   ├── team.html               ← Leadership Team
│   └── partners.html           ← Technology Partners
├── resources/
│   ├── case-studies.html       ← Case Studies (4 write-ups)
│   ├── blog.html               ← Blog placeholder
│   └── webinars.html           ← Webinars placeholder (future)
├── contact/
│   ├── request-demo.html       ← Primary conversion page
│   ├── index.html              ← General contact + forms
│   └── onboarding.html         ← Implementation process
├── sitemap.html                ← Visual sitemap for review
├── assets/
│   └── scs-logo.png            ← Existing logo
└── docs/
    └── plan.md                 ← This file
```

---

## Task 1: Extract Shared Foundation

**Goal:** Pull Light Editorial's inline styles into the shared `styles.css`, update `script.js` with all interactions, and create reusable HTML partials (nav + footer) documented as copy-paste blocks.

**Files:**
- Modify: `styles.css` — replace current Original styles with Light Editorial styles
- Modify: `script.js` — merge Light Editorial's inline JS (observers, counters, mobile nav)
- Create: `docs/partials.md` — copy-paste reference for nav and footer HTML

- [ ] **Step 1:** Read `v2-light-editorial.html` inline `<style>` block (lines 8–530 approx) and replace the contents of `styles.css` with it. Add CSS custom properties at `:root` for all brand colors from the design guide (teal family, green, orange, amber, red, neutrals).

- [ ] **Step 2:** Read `v2-light-editorial.html` inline `<script>` block and merge into `script.js`. Keep: sticky nav shadow, mobile hamburger toggle, smooth scroll, IntersectionObserver reveal animations, counter animation. Remove duplicates.

- [ ] **Step 3:** Add to `styles.css`: utility bar styles from Original (`styles.css` lines 30–60), dropdown menu styles from Original (lines 80–170), logo marquee animation from Original (lines 370–430), integration partners grid from Original (lines 700–780).

- [ ] **Step 4:** Document the shared nav HTML (utility bar + sticky nav with mega dropdowns) and footer HTML as copy-paste blocks in `docs/partials.md`. Nav must include:
  - Utility bar: phone, email, Customer Portal, Support links
  - Logo left, centered links (Solutions ▾, Industries ▾, About ▾, Resources), red "Request a Demo" CTA right
  - Mega menu dropdowns for Solutions and Industries (per design guide Section 7.5), simple dropdowns for About
  - Mobile hamburger with full-screen overlay

  Footer must include 4 columns per design guide Section 6.10:
  - **Solutions:** vPermit, vCompliance, vPark, Platform, Integrations
  - **Industries:** Higher Ed, Municipalities, Healthcare, K-12
  - **Resources:** Case Studies, Blog, Webinars
  - **Company:** About, Team, Contact, Careers
  - Bottom bar: copyright + Privacy Policy + Accessibility Statement + social links (all `#` placeholder)

- [ ] **Step 5:** Verify by creating a minimal test page that links `styles.css` + `script.js` and includes the nav/footer partials. Open in browser, confirm nav dropdowns work, mobile hamburger works, scroll shadow appears.

- [ ] **Step 6:** Commit: `feat: extract shared styles, scripts, and nav/footer partials`

---

## Task 2: Rebuild Homepage

**Goal:** Rebuild `index.html` using Light Editorial's design language, populated with all content from the Original mockup. This is the anchor page — every section from the design guide Section 6 must be present.

**Files:**
- Rewrite: `index.html` — Light Editorial layout + Original content

**Sections (per design guide Section 6):**

- [ ] **Step 1: Nav + Utility Bar** — Use partials from Task 1. Link to `styles.css` + `script.js`.

- [ ] **Step 2: Hero** — Light Editorial two-column layout:
  - Left: eyebrow "Trusted by Harvard, Princeton & leading universities", h1 "The Modern Parking Platform for Higher Education", subtitle, two CTAs (red "Request a Demo" + outlined "Watch How It Works")
  - Right: placeholder image area with gradient + floating stat cards (75% AU/NZ market, 15+ years, 8 US universities)
  - Rainbow accent bar below hero (from Original)

- [ ] **Step 3: Product Pillars** — Three cards in Light Editorial card style (white bg, colored top accent bar, hover lift):
  - vPermit (green `#4DAE37`): icon, title, subtitle, description, feature bullets, "Learn More →"
  - vCompliance (orange `#EB5B25`): same structure
  - vPark (amber `#F0AE25`): same structure
  - Content from Original mockup + design guide Section 2

- [ ] **Step 4: Integration Story** — Light Editorial two-column:
  - Left: "Integrated (for) Life" heading, paragraph on integration approach, checkmark bullet list
  - Right: hub-and-spoke SVG diagram (vPermit/vCompliance/vPark nodes + 6 outer category boxes)
  - "See Our Integrations →" link

- [ ] **Step 5: Client Logo Bar** — Animated marquee (from Original) with 8 university names/logos:
  Harvard, Princeton, St. Edward's, Chapman, Seton Hall, USD, UAkron, UToledo

- [ ] **Step 6: Why SCS / Value Propositions** — 6-card grid (3×2) in Light Editorial numbered style. Design guide Section 6.5 specifies 6 items from the 8 messaging pillars (Section 4.3). Selected 6 that best differentiate SCS visually; "Proven Track Record" is covered by the logo bar + testimonials, and "Transparent Pricing" is a sales conversation topic:
  1. Built for Modern Operations (cloud icon)
  2. Open Ecosystem (API icon)
  3. Superior UX (interface icon)
  4. Data & AI Insights (chart icon)
  5. Highly Configurable (settings icon)
  6. True Partnership (handshake icon)
  - Each: number label, icon, heading, description paragraph

- [ ] **Step 7: Featured Testimonial** — Full-width teal gradient background:
  - Large quote: Claire Guo, ParkUToledo
  - Attribution with name, title, institution

- [ ] **Step 8: Switching Section** — Light Editorial two-column:
  - Left: "Replacing your legacy system?" heading, paragraph about T2/NuPark/iParq migration, CTA
  - Right: 5-step numbered timeline (Discovery Workshop → Agile Config → IT Partnership → Data Migration → Training & Go-Live)

- [ ] **Step 9: Testimonial Cards** — 3-card grid:
  - Don Yarosevit (St. Edward's), Scott Gulliford (Princeton), Sheryl Boyd (Chapman)
  - Light Editorial card style with quote marks, colored avatars

- [ ] **Step 10: Integration Partners Grid** — 6-category grid (from Original). *Note: this section is not in the design guide's Section 6 homepage spec but was present in the Original mockup and strengthens the "30+ integrations" differentiator. Included as an intentional enhancement.*
  - SSO/Identity, Cameras & LPR, HR/Student Systems, Payments, BI/Analytics, Cloud & PARCS
  - Partner names listed under each category

- [ ] **Step 11: CTA Block** — Dark gradient section:
  - Left: stats + heading "Ready to modernize your campus parking?"
  - Right: form (Name, Email, Institution, Challenge textarea, Submit)

- [ ] **Step 12: Footer** — Use footer partial from Task 1. Four columns per design guide:
  - **Solutions:** vPermit, vCompliance, vPark, Platform, Integrations
  - **Industries:** Higher Ed, Municipalities, Healthcare, K-12
  - **Resources:** Case Studies, Blog, Webinars
  - **Company:** About, Team, Contact, Careers
  - Bottom bar: copyright, Privacy Policy (`#`), Accessibility Statement (`#`), social links (`#`)

- [ ] **Step 13:** Open `http://localhost:8091/` — visually verify all 12 sections render correctly, scroll animations fire, nav dropdowns work, mobile responsive at 375px/768px/1280px.

- [ ] **Step 14:** Commit: `feat: rebuild homepage — Light Editorial design + full content`

---

## Task 3: Solution Pages (5 pages)

**Goal:** Build individual product pages and the platform/integrations overview pages. Each follows a consistent template: hero → features → screenshots → testimonial → CTA.

**Files:**
- Create: `solutions/vpermit.html`
- Create: `solutions/vcompliance.html`
- Create: `solutions/vpark.html`
- Create: `solutions/platform.html`
- Create: `solutions/integrations.html`

### Shared Solution Page Template

```
Nav + Utility Bar
Hero: product name, tagline, accent color, CTA
Feature Grid: 6-8 features with icons (from design guide Section 2)
Screenshot Placeholder: product dashboard mockup area
How It Works: 3-4 step process
Relevant Testimonial: matching customer quote
Cross-sell: links to other two products
CTA Block: "Request a Demo" form
Footer
```

- [ ] **Step 1: vPermit** (`solutions/vpermit.html`)
  - Hero: green accent, "Virtual Permit Management", tagline about unlimited rules + SSO + self-service
  - Features from design guide: unlimited permit rules, guest/visitor/event management, automated communications & waitlist, secure integrations (API-first, SSO, 2FA), payroll deduction, self-service portal
  - Testimonial: Don Yarosevit (St. Edward's) — platform transition quote
  - Cross-sell: vCompliance + vPark cards

- [ ] **Step 2: vCompliance** (`solutions/vcompliance.html`)
  - Hero: orange accent, "Enforcement & Citation Management"
  - Features: LPR integration, electronic & physical citations, real-time validation, customer portal, route optimization, automated tasks
  - Testimonial: Sheryl Boyd (Chapman) — "productivity increased exponentially"
  - Cross-sell: vPermit + vPark cards

- [ ] **Step 3: vPark** (`solutions/vpark.html`)
  - Hero: amber accent, "Mobile Payments & Parking Sessions"
  - Features: PayGo + QR, voice-activated (Alexa), differential rates, Apple/Google Pay, zone alerts + occupancy, corporate accounts, 7 session initiation methods
  - Testimonial: Claire Guo (UToledo)
  - Cross-sell: vPermit + vCompliance cards

- [ ] **Step 4: Platform** (`solutions/platform.html`)
  - Hero: teal accent, "Three Products. One Integrated Ecosystem."
  - Central diagram: how vPermit + vCompliance + vPark connect
  - Integration story from homepage (expanded)
  - Data flow explanation: permits validate enforcement, payments link to permits, enforcement validates parking rights
  - All 4 testimonials rotating

- [ ] **Step 5: Integrations** (`solutions/integrations.html`)
  - Hero: "30+ Integration Partners. Zero Vendor Lock-in."
  - 6-category partner grid (expanded from homepage): SSO, Cameras/LPR, HR/Student, Payments, BI/Analytics, Cloud/PARCS
  - API-first messaging
  - Cloud architecture section
  - CTA: "Request Integration Documentation"

- [ ] **Step 6:** Verify all 5 pages load, nav links work, cross-links between pages work. Check mobile responsive.

- [ ] **Step 7:** Commit: `feat: add 5 solution pages — vPermit, vCompliance, vPark, Platform, Integrations`

---

## Task 4: Industry Pages (4 pages)

**Goal:** Build industry-specific landing pages. Higher Education is the primary page with full content. The other three are lighter "emerging market" pages.

**Files:**
- Create: `industries/higher-education.html`
- Create: `industries/municipalities.html`
- Create: `industries/healthcare.html`
- Create: `industries/k12.html`

### Higher Education Template (full page)

```
Nav + Utility Bar
Hero: campus-focused headline, higher-ed specific stats
Pain Points: legacy system problems universities face
Solution Overview: how vPermit + vCompliance + vPark solve each pain
Client Logos: 8 US universities
Case Study Highlights: 2-3 mini case studies
Testimonials: all 4 quotes
Switching/Onboarding: migration process
CTA Block
Footer
```

### Emerging Market Template (lighter)

```
Nav + Utility Bar
Hero: market-specific headline
Challenges: 3-4 pain points for this vertical
How SCS Helps: product mapping to challenges
CTA: "Let's Talk About Your [Market] Needs"
Footer
```

- [ ] **Step 1: Higher Education** (`industries/higher-education.html`)
  - Hero: "The Parking Platform Built for Higher Education"
  - Stats: 75% AU/NZ market share, 8 US universities, 15+ years
  - Pain points: legacy client-server systems, manual enforcement, fragmented permits/payments
  - Solution mapping: each pain → SCS product
  - All 8 client logos
  - 4 testimonial cards
  - Migration section with 5-step process

- [ ] **Step 2: Municipalities** (`industries/municipalities.html`)
  - Hero: "Smart Parking for Modern Cities"
  - Challenges: downtown congestion, citation revenue leakage, citizen complaints, fragmented meters
  - Solutions: vPark mobile payments, vCompliance LPR enforcement, real-time occupancy data

- [ ] **Step 3: Healthcare** (`industries/healthcare.html`)
  - Hero: "Parking That Works for Patients, Staff & Visitors"
  - Challenges: patient wayfinding, staff permit management, visitor validation, ADA compliance
  - Solutions: vPermit staff/visitor permits, vPark patient-friendly payments, vCompliance validation

- [ ] **Step 4: K-12** (`industries/k12.html`)
  - Hero: "Campus Parking for K-12 School Districts"
  - Challenges: staff permits, parent drop-off zones, event parking, limited budgets
  - Solutions: vPermit for staff, vCompliance for zones, simple pricing

- [ ] **Step 5:** Verify all 4 pages. Check nav dropdown links match. Mobile responsive check.

- [ ] **Step 6:** Commit: `feat: add 4 industry pages — Higher Ed, Municipalities, Healthcare, K-12`

---

## Task 5: About Pages (3 pages)

**Goal:** Build company pages from SOW content (SCS Background, Company Approach, Contact).

**Files:**
- Create: `about/index.html`
- Create: `about/team.html`
- Create: `about/partners.html`

- [ ] **Step 1: Our Story** (`about/index.html`)
  - Hero: "15+ Years of Parking Innovation"
  - Timeline: founded as CellOPark Australia (2008) → rebranded Smarter City Solutions (2018) → US expansion
  - Company approach: true partnership, not just software
  - Values: customer-led innovation, agile onboarding, 2 in-person visits
  - Contact info section at bottom

- [ ] **Step 2: Team** (`about/team.html`)
  - Hero: "The Team Behind SCS"
  - Placeholder team grid: 6-8 cards with avatar placeholders, name, title
  - Note: "Team photos and bios to be provided by SCS"

- [ ] **Step 3: Partners** (`about/partners.html`)
  - Hero: "Our Technology Ecosystem"
  - Reuse integration partners grid from homepage (expanded)
  - Partner categories with descriptions of each integration type
  - "Become a Partner" CTA

- [ ] **Step 4:** Verify all 3 pages. Check nav links.

- [ ] **Step 5:** Commit: `feat: add 3 about pages — Our Story, Team, Partners`

---

## Task 6: Resources Pages (2 pages)

**Goal:** Build case studies page with full narrative write-ups from the 4 customer quotes, and a blog placeholder.

**Files:**
- Create: `resources/case-studies.html`
- Create: `resources/blog.html`

- [ ] **Step 1: Case Studies** (`resources/case-studies.html`)
  - Hero: "How Universities Modernize with SCS"
  - Filter bar (visual only): All / vPermit / vCompliance / vPark
  - 4 case study cards linking to expanded sections on same page:

  **Case Study 1 — University of Toledo (ParkUToledo)**
  - Challenge: needed citation hold buffer, no competitor could deliver
  - Solution: SCS customized 1-hour citation hold buffer
  - Quote: Claire Guo, Executive Director
  - Results placeholder: "X permits processed, Y% reduction in disputes"

  **Case Study 2 — St. Edward's University**
  - Challenge: transitioning from NuPark, new processes needed
  - Solution: SCS worked to adapt existing business processes to new platform
  - Quote: Don Yarosevit
  - Results placeholder

  **Case Study 3 — Princeton University**
  - Challenge: needed simple, low-burden interfaces for parking admin
  - Solution: SCS provided intuitive interfaces that reduce admin burden
  - Quote: Scott Gulliford, CMP, Deputy Director
  - Results placeholder

  **Case Study 4 — Chapman University**
  - Challenge: enforcement productivity and community perception
  - Solution: vCompliance deployment
  - Quote: Sheryl Boyd — "productivity increased exponentially"
  - Results placeholder

- [ ] **Step 2: Blog** (`resources/blog.html`)
  - Hero: "Insights & Resources"
  - "Coming Soon" section with placeholder cards:
    - "The Parkumentary" series concept
    - "Emerging Markets in Smart Parking"
    - "From Legacy to Cloud: A Migration Guide"
  - Newsletter signup form (mockup)

- [ ] **Step 3: Webinars** (`resources/webinars.html`)
  - Hero: "Webinars & Events"
  - "Coming Soon" state with placeholder for future webinar listings
  - Newsletter signup: "Get notified when we launch"

- [ ] **Step 4:** Verify all 3 pages.

- [ ] **Step 5:** Commit: `feat: add case studies (4 narratives), blog and webinars placeholders`

---

## Task 7: Contact & Form Pages (3 pages)

**Goal:** Build the conversion pages with mockup forms matching SOW requirements (Request a Demo, Unique Challenges, Discovery).

**Files:**
- Create: `contact/request-demo.html`
- Create: `contact/index.html`
- Create: `contact/onboarding.html`

- [ ] **Step 1: Request a Demo** (`contact/request-demo.html`)
  - Two-column layout: left = value props summary + client logos, right = form
  - Form fields: First Name, Last Name, Email, Phone, Institution Name, Role/Title, dropdown "How did you hear about us?", textarea "What's your biggest parking challenge?"
  - Red submit button "Request Your Demo"
  - Below form: "Or call us: +1 (555) 123-4567"

- [ ] **Step 2: General Contact** (`contact/index.html`)
  - Three contact paths as cards:
    1. "Request a Demo" → links to request-demo.html
    2. "Unique Challenges" form — for campuses with unusual requirements
    3. "Operational Discovery" form — for detailed operational assessment
  - Contact info: phone, email, address placeholder
  - Map placeholder area

- [ ] **Step 3: Onboarding** (`contact/onboarding.html`)
  - Hero: "Switching is Easier Than You Think"
  - Expanded 5-step timeline (full page version):
    1. Discovery Workshop (Week 1) — detailed description
    2. Agile Configuration (Weeks 2-3)
    3. IT Partnership (Week 4-5)
    4. Data Migration (Week 6-7)
    5. Training & Go-Live (Week 8)
  - Differentiators: 2 in-person visits, dedicated project manager, parallel run period
  - Testimonial: Don Yarosevit on the transition experience
  - CTA: "Start Your Migration"

- [ ] **Step 4:** Verify all 3 pages. Test form layouts at mobile/desktop.

- [ ] **Step 5:** Commit: `feat: add 3 contact pages — Request Demo, Contact, Onboarding`

---

## Task 8: Cross-Page Polish & Navigation

**Goal:** Wire everything together — all nav links point to real pages, all CTAs link correctly, responsive check across all pages.

**Files:**
- Modify: all `.html` files — update nav links and CTAs

- [ ] **Step 1:** Update nav dropdown links in every page to point to correct relative paths:
  - Solutions: `../solutions/vpermit.html`, etc. (adjust relative path per page depth)
  - Industries: `../industries/higher-education.html`, etc.
  - About: `../about/index.html`, etc.
  - Resources: `../resources/case-studies.html`, etc.
  - "Request a Demo" CTA → `../contact/request-demo.html`

- [ ] **Step 2:** Update all footer links across every page to match nav links.

- [ ] **Step 3:** Update all inline CTAs ("Learn More →", "See Our Integrations →", "Request a Demo", etc.) to link to the correct pages.

- [ ] **Step 4:** Add breadcrumb navigation to all inner pages (e.g., "Home / Solutions / vPermit").

- [ ] **Step 5:** Responsive spot-check: open homepage + 1 solution page + 1 industry page at 375px, 768px, 1280px. Fix any layout breaks.

- [ ] **Step 6:** Commit: `feat: wire all cross-page navigation and CTAs`

---

## Task 9: Sitemap Page

**Goal:** Create a visual sitemap page that lists every page with links, organized by section, for review.

**Files:**
- Create: `sitemap.html`

- [ ] **Step 1:** Build `sitemap.html` with:
  - Visual tree layout showing all pages organized by section
  - Every page linked and clickable
  - Status badges: "Complete" (green), "Placeholder Content" (amber), "Needs Assets" (grey)
  - Page count summary
  - Section: Homepage, Solutions (5), Industries (4), About (3), Resources (3), Contact (3) = **19 pages + sitemap = 20 total**

- [ ] **Step 2:** Open sitemap, click every link, verify all pages load.

- [ ] **Step 3:** Commit: `feat: add visual sitemap page for review`

---

## Task 10: Cleanup & Archive

**Goal:** Remove old mockup variants, update design guide.

**Files:**
- Delete: `v2-bold-geometric.html`, `v2-dark-cinematic.html`, `v2-glass-depth.html`, `v2-light-editorial.html`, `compare.html`
- Modify: `SCS_USA_Design_Guide.md` — update Section 11 next steps

- [ ] **Step 1:** Move old variants to an `archive/` folder (don't delete — preserve for reference).

- [ ] **Step 2:** Update design guide Section 11 to reflect completed items.

- [ ] **Step 3:** Final commit: `chore: archive old variants, update design guide`

---

## Summary

| Task | Pages Created | Description |
|------|--------------|-------------|
| 1 | 0 | Extract shared foundation (styles, scripts, partials) |
| 2 | 1 | Rebuild homepage (Light Editorial + full content) |
| 3 | 5 | Solution pages (vPermit, vCompliance, vPark, Platform, Integrations) |
| 4 | 4 | Industry pages (Higher Ed, Municipalities, Healthcare, K-12) |
| 5 | 3 | About pages (Our Story, Team, Partners) |
| 6 | 3 | Resources pages (Case Studies, Blog, Webinars) |
| 7 | 3 | Contact pages (Request Demo, Contact, Onboarding) |
| 8 | 0 | Cross-page navigation wiring |
| 9 | 1 | Visual sitemap |
| 10 | 0 | Cleanup & archive |
| **Total** | **20 pages** | |
