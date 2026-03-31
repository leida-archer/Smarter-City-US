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
- HubSpot form integration (currently mockup HTML forms)
- GA4 + Microsoft Clarity + HubSpot tracking
- Privacy Policy, Accessibility Statement pages (footer links are `#`)
- Social media links (placeholder `#`)
- Real campus photography (hero, product screenshots)
- Team photos and bios
- Blog and webinar content
- Case study result metrics
- Video testimonials / SW intro
