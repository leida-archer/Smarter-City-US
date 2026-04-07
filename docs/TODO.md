# SCS USA Website — TODO

## QA
- [ ] Mobile QA: verify all 19 pages render correctly at 375px, 768px, 1280px on live site
- [ ] Test hamburger menu open/close on all pages
- [ ] Verify all nav dropdown links work across pages
- [ ] Verify all footer links work across pages
- [ ] Check logo marquee animation on mobile
- [ ] Test CTA form submissions (mockup alerts fire)
- [ ] Cross-browser check: Safari, Chrome, Firefox
- [ ] Lighthouse audit: performance, accessibility, SEO

## Deferred (need clarity from SCS team)
- [ ] **"SCES" branding decision** — Jim/Mike (2026-04-06 review) debated whether to rename "SCES" to something tied to "experience" or keep it and visually stylize (color/italic/bolder logo). Term doesn't appear in current mockup. Need: what SCES stands for, where it should appear, and rename-vs-restyle decision. Then implement.
- [ ] **"Our US journey" timeline content** — Section structure rebuilt on `about/index.html` per Mike's "entry into US → smaller schools → complex universities → future" arc. **All 4 timeline steps currently contain `[PLACEHOLDER]` text** that must be replaced with real milestones from Jim's slide deck. Specifically need:
  - Year of first US deployment + the pilot school's name
  - The 3–5 "smaller schools" cohort that followed (years + names)
  - The deployment that marked the shift to complex multi-campus systems (year + name)
  - 2026+ roadmap items safe to publicly tease (AI agents, residential, corporate campus, gated library — confirm with Jim)
- [ ] **Hero illustration rebuild (Change 1 + 4)** — deferred to end. Needs the smarter-city scene with LPR car, fixed cameras, vPark QR sign, vCompliance dashboard graphic in a window. Will replace `assets/scs_landing_v13a.png`.
- [ ] **Case study cliffhanger metrics (Change 22)** — `resources/case-studies.html` rebuilt as cliffhanger cards. Each of the 4 cards (UToledo, St. Edward's, Princeton, Chapman) shows the customer + challenge + 3 outcome metrics + a fade-out region + "Read full story" CTA going to `account/signup.html`. **All 12 outcome metric numbers are `[XX]%` / `[X.X]x` placeholders** that Jim must replace with real data before publishing. Methodology paragraphs and customer quotes were intentionally stripped from the public HTML (per Jim 01:09:02) and need to live in the gated full case study layer (which doesn't exist yet — out of scope for the mockup).

- [ ] **Online pricing calculator (Change 27 — POST-LAUNCH)** — Jim/Mike (01:48:12) discussed building an interactive calculator where prospects pick products + integrations + scale → see a preliminary SOW + price estimate → submit to sales for a finalized quote. Explicitly labeled post-launch in the original change list. Blocked on:
  - **Real pricing data** — Jim has rough tier names (Basic / Silver / Gold / Platinum / Platinum Plus) + 10% Sourcewell discount, but real annual SaaS prices aren't finalized
  - **Mike's complexity matrix** — Mike committed (01:48:59) to deliver Steve+Matt's complexity analysis: which integrations are L1 (free — SSO, payment gateways), L2 (ERP), L3 (access control like T2). Calculator can't price without this matrix.
  - **Preliminary SOW template** — what does the generated SOW actually say? Needs sales team input on the boilerplate
  - **Submit-to-sales backend** — auto-generates a quote in SCS's CRM (out of scope for static mockup)
  Implementation when ready: build as a multi-step interactive form on `resources/pricing.html` (replacing the current gated stub), with vanilla JS for state + dynamic pricing math, behind the same Resource Library gate as other pricing content.

- [ ] **In-house LPR rebrand (Change 20)** — Jim (00:55:52) wanted to "make up a name for SCS's own in-app open LPR solution for branding purposes." Currently `assets/logos/b2b/openalpr.png` sits in the Cameras & LPR partner row on `index.html`, `solutions/integrations.html`, and `about/partners.html` (position 3 in all 3). The site never describes whether OpenALPR is a 3rd-party partner or SCS's in-house engine — Jim's phrasing implies the latter (they're likely using the open-source OpenALPR library compiled into their own software). Need from SCS team:
  - Confirmation: is OpenALPR your underlying LPR engine (option 1 — rebrand it) or a real 3rd-party integration partner (option 2 — leave as-is)?
  - The new name. Suggested options: **vLPR** (fits the existing v-family pattern — vPermit/vCompliance/vPark), **vSight**, **vScan**, or something custom. Jim's call.
  - Promotion level: stays in the partner row with new branding, OR gets promoted to a 4th product in the v-family with its own solution page + nav slot? (Big-vs-small scope decision.)
  - Wordmark asset: SCS designs a real logo, OR a temporary SVG wordmark suffices for the mockup.
  Once decided: rename the alt text + label sitewide, replace `openalpl.png` with the new wordmark, and (if promoted) build the solution page + nav entry.

- [ ] **SIS scrolling logo marquee (Change 17)** — Mike asked (00:12:29, 00:14:15) to replace the text list "Banner, PeopleSoft, Workday" on the homepage Integration block with scrolling logos. Initial implementation squished the right-column diagram and was reverted. Blocked on: (1) Jim's trademark concern (00:13:34) — needs vendor permission resolved before logos go public, (2) a layout fix that doesn't expand the integration `<li>` height enough to crush the adjacent diagram (consider: pull SIS marquee out of the bullet list entirely and render as a separate strip below the 4 bullets, OR shrink logo height to 22px, OR widen the integration-grid left column).

- [ ] **Team page content** — `about/team.html` rebuilt per Jim's directive (2026-04-06 review): public surface shows photo + name + role + 1-line parking-experience tagline; full bios moved behind the Resource Library gate to protect from competitors (T2 actively recruits parking-savvy leaders). All 6 cards currently contain `[PLACEHOLDER]` taglines. Need from Jim:
  - Real names + photos for the 6 (or actual) leadership roles
  - 1-line parking-specific tagline per person (years + specialty + prior employer pattern — e.g. *"15+ years building permit systems for ACC universities"*)
  - Full long-form bios for the gated layer (career history, prior roles, parking-specific expertise, how they joined SCS)
  - Once Resource Library (Change #21) is built, wire the "Sign up to read full bios" button on team.html to the real signup flow (currently `#`)

## Content
- [ ] Replace hero placeholder image with real campus photography
- [ ] Add product dashboard screenshots to solution pages
- [ ] Write full case study narratives with metrics (UToledo, St. Edward's, Princeton, Chapman)
- [ ] Get team photos and bios from SCS
- [ ] Blog and webinar content when ready

## Production
- [ ] HubSpot form integration (replace mockup forms)
- [ ] GA4 + Microsoft Clarity + HubSpot tracking
- [ ] Create Privacy Policy and Accessibility Statement pages
- [ ] Add social media links to footer
- [ ] Framework decision: Next.js or Astro for production build

## DNS Setup (Custom Domain → Cloudflare Pages)
1. **Add site to Cloudflare Pages:** Dashboard → Pages → Create project → Connect to `leida-archer/Smarter-City-US` repo
2. **Build settings:** Framework preset: None, Build command: (empty), Output directory: `/`
3. **Set env vars:** `CONTACT_EMAIL`, `RESEND_API_KEY` (see docs/form-setup.md)
4. **Add custom domain:** Pages project → Custom domains → Add domain
5. **DNS records in Cloudflare:** (if domain is already on Cloudflare DNS)
   - `CNAME` → `@` → `smarter-city-us.pages.dev` (proxied)
   - `CNAME` → `www` → `smarter-city-us.pages.dev` (proxied)
6. **If domain is on an external registrar:**
   - Option A: Transfer nameservers to Cloudflare (recommended — full CDN + DDoS + SSL)
   - Option B: Add CNAME at registrar pointing to `smarter-city-us.pages.dev` + verify in Cloudflare
7. **SSL:** Automatic via Cloudflare — no cert needed
8. **Verify:** Wait 5-10 min for DNS propagation, then check `https://yourdomain.com`
