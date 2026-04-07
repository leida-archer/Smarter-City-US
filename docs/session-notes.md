# SCS USA Website — Session Notes

## 2026-03-30: Initial Build + Mobile Optimization

### What was built
- **19-page static site** using Light Editorial design direction
- Homepage + 5 Solutions + 4 Industries + 3 About + 3 Resources + 3 Contact
- Shared `styles.css` (1500+ lines) and `script.js` (147 lines)
- All pages share consistent nav (utility bar + sticky nav + mega dropdowns) and footer (5-col + rainbow bar)

### Design decisions
- **Design direction:** Light Editorial selected over Bold Geometric, Dark Cinematic, Glass Depth, and Original
- **Background:** `#FAFAF8`
- **Typography:** DM Sans headings (weight 300, tight letter-spacing), Inter body (15-17px, `#475569`)
- **Cards:** white bg, subtle borders, 16px radius, hover lift `translateY(-4px)`
- **Buttons:** Primary red `#D41B24` 10px radius, secondary teal outline
- **Animations:** Scroll reveal via IntersectionObserver (translateY 32px → 0, opacity 0 → 1)
- **Nav:** Frosted glass `rgba(255,255,255,0.92)` with backdrop-filter blur

### Logo setup
- **Nav icon:** `assets/scs-icon.png` — infinity symbol only, 51px CSS height
- **Footer logo:** `assets/scs-logo.png` — full logo with text + tagline, 68px CSS height
- Source: `SCS Logo with Text Smaller copy.png` (icon) and `SCS Logo with Text Smaller.png` (full) from Brand Identity folder
- Both cropped to content, 5% padding, transparent PNG, 132px actual height (3x retina)

### Partner & university logos
- **8 university logos** in `assets/logos/university/` — 200px content height, transparent, grayscale on page with hover-to-color
- **21 B2B partner logos** in `assets/logos/b2b/` — 200px content height, transparent, grayscale with hover-to-color
- Source copies in `/Users/archer/Desktop/SCS/SCS Website & Research/Partner Assets/`
- University of San Diego logo was manually replaced (user-provided horizontal version)
- Sensor Dynamics logo fetched from sensordynamics.com.au SVG, converted to PNG

### CSS architecture
- `:root` custom properties for all brand colors
- 4 breakpoints: desktop (default), tablet (1024px), mobile (767px), small mobile (480px)
- Mobile: utility bar hidden, hamburger nav, hero visual hidden, single-column stacks
- Partner logos: `height: 32px` on mobile, `height: 24px` at 480px
- University logos in marquee: `height: 48px` desktop, `height: 32px` mobile

### Footer spacing fix
- Rainbow bar was too close to footer content
- Fix: added `margin-top: 48px` to `.footer-grid`

### Mobile responsive (767px breakpoint)
- Utility bar: hidden
- Nav: hamburger menu, 40px logo
- Hero: visual column hidden, CTAs stack vertically, full-width
- Products: single column, 32px/24px padding
- Integration diagram: 2-col spokes, smaller hub
- Logo bar: 32px height logos
- Values: single column
- Testimonials: reduced font sizes, tighter padding
- Partners: single column categories, 24px logo height
- CTA: stacked form, tighter padding
- Footer: 2-col grid (brand spans full width), stacked at 480px

### Files structure
```
scs-usa-mockup/
├── index.html                  ← Homepage
├── styles.css                  ← Shared stylesheet
├── script.js                   ← Shared interactions
├── .gitignore
├── solutions/                  ← 5 product pages
├── industries/                 ← 4 market pages
├── about/                      ← 3 company pages
├── resources/                  ← 3 content pages
├── contact/                    ← 3 conversion pages
├── assets/
│   ├── scs-icon.png            ← Nav logo (infinity only)
│   ├── scs-logo.png            ← Footer logo (full with text)
│   └── logos/
│       ├── university/         ← 8 university logos
│       └── b2b/                ← 21 partner logos
├── archive/                    ← Old design variants
└── docs/
    ├── plan.md                 ← Build plan
    ├── partials.md             ← Nav/footer HTML reference
    └── session-notes.md        ← This file
```

### GitHub
- Repo: `leida-archer/Smarter-City-US`
- GitHub Pages: https://leida-archer.github.io/Smarter-City-US/
- Deployed via legacy GitHub Pages (main branch, root)

### Deferred to production
- GA4 + Microsoft Clarity + HubSpot tracking
- Privacy Policy, Accessibility Statement pages (footer links are `#`)
- Social media links (placeholder `#`)
- Real campus photography (hero, product screenshots)
- Team photos and bios
- Blog and webinar content
- Case study result metrics
- Video testimonials / SW intro

---

## 2026-03-31: Form Backend, Logo Updates, UI Fixes

### Form backend
- **Cloudflare Pages Function** at `functions/api/submit.js` — catches all form POSTs, sends formatted HTML email via Resend API
- 20 forms across 19 pages all POST to `/api/submit` with hidden `form_name` field
- All inputs have proper `name` attributes (snake_case)
- Success banner shows on redirect (`?submitted=FormName`) — auto-dismisses after 8s
- Setup: just set `CONTACT_EMAIL` + `RESEND_API_KEY` env vars in Cloudflare dashboard
- Full guide: `docs/form-setup.md`

### New logos added
- **ADVAM** (`assets/logos/b2b/advam.png`) — added to integrations + partners pages
- **Google Cloud** (`assets/logos/b2b/google-cloud.png`) — added to integrations + partners pages
- **Sensor Dynamics** (`assets/logos/b2b/sensor-dynamics.png`) — fetched from sensordynamics.com.au SVG
- Total B2B logos now: **23**

### UI fixes
- **Utility bar removed entirely** — was causing unclosed `<div>` that bled teal background across all inner pages
- **Page hero h1** bumped from `font-weight: 300` → `400` for readability
- **Page hero body text** darkened from `--gray` (#64748B) → `--slate` (#475569)
- **Footer rainbow bar** spacing: 48px margin-top on `.footer-grid`
- **Footer logo** set to 68px height (full logo with text)
- **Nav icon** set to 51px (infinity symbol only, matches footer icon proportion)

### Current state
- **Live:** https://leida-archer.github.io/Smarter-City-US/
- **Repo:** github.com/leida-archer/Smarter-City-US (4 commits on main)
- **All forms ready** — just needs Resend API key + Cloudflare Pages deploy
- **DNS setup** instructions in `docs/TODO.md`
- **Mobile responsive** — tested at 375px, 768px, 1280px
- **23 B2B logos + 8 university logos** — all transparent PNG, greyscale with hover-to-color

### Next session
- [ ] QA pass on live site (mobile + desktop + cross-browser)
- [ ] Deploy to Cloudflare Pages (currently on GitHub Pages)
- [ ] Connect custom domain
- [ ] Set up Resend API key for form submissions
- [ ] Content: hero photography, product screenshots, case study metrics

---

## 2026-03-31: Homepage Animation Brainstorm (In Progress)

### Design approved
- **Concept:** Looping background video — line-art patrol car (Ford Escape w/ LPR sensors) drives a continuous circuit through the parking lot
- **Path:** Enter left on road → turn into lot center lane → scan parked cars (teal beams active) → exit lot → exit right → seamless loop
- **Scan beams:** Teal `#47BBE8` glow cones, pulse 20%→35% opacity, active entire time car is in lot
- **Output:** Pre-rendered MP4 (H.264), ~12-15s loop, 30fps, `<video autoplay loop muted playsinline>`
- **Design doc:** `/Users/archer/Desktop/SCS/SCS Website Animation/homepage-animation-design.md`
- **Brainstorm visuals:** `scs-usa-mockup/.superpowers/brainstorm/` (patrol-path-v3.html is latest)

### Car sprite status — BLOCKED
- Side-right sprite exists: `Landing Page Car/car_side_right_final.png` (raster, from Nanobanana)
- SVG hand-drawing attempted — 7 drafts in `Landing Page Car/svg-drafts/`
- Auto-trace from v5 (OpenCV contours) produced correct proportions but too messy
- Hand-drawn SVG (v3) is cleaner but proportions don't read as compact SUV
- **Blocker:** Need a reliable method to create clean line-art car at multiple angles
- User is researching alternative approaches

### What's needed to unblock
- A clean side-right car sprite (SVG or high-res PNG) in matching line-art style
- Then: rear, 3/4 rear, 3/4 front angles from the same base
- Once sprites are done, the Python animation engine can be built
