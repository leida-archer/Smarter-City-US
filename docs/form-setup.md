# SCS USA — Form Submission Setup

## How it works

All forms POST to `/api/submit`, handled by a Cloudflare Pages Function (`functions/api/submit.js`). The function formats the data into a clean HTML email and sends it via Resend to your configured inbox.

## Setup (one-time, ~5 minutes)

### 1. Get a Resend API key
1. Go to [resend.com](https://resend.com) and sign up (free, no credit card)
2. Go to **API Keys** → **Create API Key**
3. Copy the key (starts with `re_`)

### 2. Set environment variables in Cloudflare
1. Go to your Cloudflare Pages project → **Settings** → **Environment variables**
2. Add these for both Production and Preview:

| Variable | Value | Example |
|----------|-------|---------|
| `CONTACT_EMAIL` | The inbox for all submissions | `info@smartercity.com` |
| `RESEND_API_KEY` | Your Resend API key | `re_abc123...` |
| `FROM_EMAIL` | (Optional) Verified sender address | `SCS Website <no-reply@smartercity.com>` |

> If you skip `FROM_EMAIL`, emails come from `onboarding@resend.dev` (Resend's shared sender — fine for testing, but set up your own domain for production).

### 3. (Optional) Verify your domain in Resend
To send from `@smartercity.com` instead of `@resend.dev`:
1. In Resend dashboard → **Domains** → **Add Domain**
2. Add the DNS records they give you
3. Set `FROM_EMAIL` to `SCS Website <no-reply@smartercity.com>`

## That's it

Every form on the site now sends to your inbox. Each email includes:
- Form name (e.g., "Demo Request", "Partner Inquiry")
- All submitted fields formatted in a clean table
- Timestamp (ET)

## Forms on the site

| Page | Form Name | Fields |
|------|-----------|--------|
| Homepage | Demo Request | Name, Email, Institution, Role, Challenge |
| Request Demo | Demo Request | First/Last Name, Email, Phone, Institution, Role, Referral, Challenge |
| Contact (form 1) | Unique Challenges | Email, Challenge |
| Contact (form 2) | Operational Discovery | Email, Operations |
| Onboarding | Migration Inquiry | Name, Email, Institution, Current System |
| Solution pages (5) | Demo Request - [Product] | Name, Email, Institution, Role |
| Industry pages (4) | Demo Request - [Market] | Name, Email, Institution, Role, Challenge |
| About | Contact - About | Name, Email, Institution, Role |
| Team | Contact - Team | Name, Email, Message |
| Partners | Partner Inquiry | Name, Email, Company, Category, Message |
| Case Studies | Demo Request - Case Studies | Name, Email, Institution, Role |
| Blog | Newsletter Signup | Name, Email |
| Webinars | Newsletter Signup | Name, Email |

## Free tier limits
- Resend free: **100 emails/day**, 3,000/month
- Cloudflare Pages Functions: **100,000 requests/day** on free plan
