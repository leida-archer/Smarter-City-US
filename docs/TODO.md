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
