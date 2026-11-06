# BioTek Sound System — Website

Site for a multigenre free party crew based in the South East UK. Built with
**Next.js 14 (App Router)** with a **built-in admin CMS** — manage events,
gallery, music and read booking enquiries from a private console.

## Quick start

```bash
npm install

# 1. Set the admin password (see .env.example)
cp .env.example .env.local
#    ADMIN_PASSWORD=your-crew-password
#    ADMIN_SECRET=$(openssl rand -hex 32)

npm run dev        # http://localhost:3000
```

Two SQLite databases are created and seeded automatically, so experimenting
in dev never touches live data:

- `data/dev/biotek.db` — used by `npm run dev`
- `data/prod/biotek.db` — used by `npm run build` / `npm run start`

## Admin console

- Footer → **Admin login** (or go to `/admin`)
- Log in with the shared `ADMIN_PASSWORD`
- Session lasts 7 days

The console has four tabs:

| Tab | What you can do |
|---|---|
| **Events** | Add / edit / delete parties. Tick *Featured* to pin one to the home page, tick *Past* to move it to the archive. Lineup is one act per line. |
| **Gallery** | Upload photos (JPG/PNG/WebP/GIF/SVG, max 10MB), write captions, delete. Photos appear in the public gallery immediately. |
| **Music** | Add sets: title, date, platform (SoundCloud / Mixcloud / Bandcamp), embed URL and platform link. One set can be *Featured* on the home page. |
| **Bookings** | Read enquiries submitted via the booking form. Mark read/unread, delete. |

## Where data lives

- `data/dev/` + `data/prod/` — SQLite databases (events, gallery, music, bookings)
- `data/<env>/uploads/` — photos uploaded via the admin console
- `content/site.json` — site name, taglines, email, social links
- `content/about.json` — about text, collective roles, standards list

The database directory can be moved with the `DATA_DIR` env var (useful for a
persistent volume in production). Back up `data/` to keep everything.

**The site ships empty** — no events, no gallery photos, no sets. Add
everything through the admin console. When you deploy, the prod database
starts fresh; anything you created locally in `data/dev/` stays local.
To copy your dev data to a new server, copy the `data/` folder across.

## Hosting (cheapest options)

This is a **server app** (admin CMS + SQLite + image uploads + mail). You need
a small always-on Node server — not static hosting.

**Cheapest good options:**

| Host | Cost | Notes |
|---|---|---|
| **Google Cloud e2-micro** | £0 forever (US regions) | Free VM, full root/SSH. Our guide: **[docs/DEPLOY-GCP.md](docs/DEPLOY-GCP.md)** |
| **Pi / old laptop + Cloudflare Tunnel** | £0 (power) | Full control, free HTTPS via tunnel, no port forwarding |
| **Oracle Cloud Free Tier** | £0 forever | ARM VM (4 cores, 24GB RAM) — great if you can get capacity |
| **Hetzner CX22** | ~£3.5/mo | 2 vCPU / 4GB, EU data centres, no lock-in |
| **one.com shared hosting** | — | ❌ PHP-only, cannot run Node apps |

**Going with Google Cloud? Follow [docs/DEPLOY-GCP.md](docs/DEPLOY-GCP.md) —
step-by-step, written for this exact project.** On any VPS:

```bash
# on the server
git clone <your-repo> && cd biotek-website
npm ci
cp .env.example .env.local    # fill in ADMIN_PASSWORD, ADMIN_SECRET, SMTP_*, SITE_URL
npm run build
npm run start                 # serves 127.0.0.1:3000 only — front it with cloudflared/nginx
```

**Pentest hardening note (F-1/p1):** `npm run start` binds to `127.0.0.1` on
purpose — the origin must NOT listen on the LAN interface. Let `cloudflared`
connect locally. If you truly need LAN access, use `npm run start:lan` and
firewall port 3000 to the tunnel host only.

Keep `data/prod/` backed up — it holds the live database and all uploaded
photos. On a VPS a nightly `rsync` or `sqlite3 .backup` cron is plenty.

**Why not Vercel by default:** serverless functions are ephemeral — SQLite
files and uploaded images vanish between invocations. If you want Vercel's
free tier anyway: swap `src/lib/db.ts` to Turso (same SQL, free tier), and
move uploads to Cloudflare R2 or UploadThing. It's a day's work; the pure-VPS
route is quicker.

## Mail-out (newsletter)

The footer signup stores subscribers in the database (with per-subscriber
unsubscribe tokens). The admin console has a **Mail** tab to compose and send
to everyone.

**One-time setup with Resend (3,000 emails/month free) — add to `.env.local`:**

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxxxxxx    # your Resend API key
MAIL_FROM=BioTek <noreply@yourdomain.co.uk>
SITE_URL=https://your-site.example
```

**Steps:**
1. Create a free account at [resend.com](https://resend.com) (no card needed)
2. Generate an API key: dashboard → API Keys → Create
3. **Verify your domain** (Domains → Add): Resend gives you DKIM/SPF records
   to paste into your DNS. Verified domain = your mail lands in inboxes
4. Without a verified domain you can only send from the shared test address
   `onboarding@resend.dev` — fine for testing the Mail tab, not for real sends
5. Paste the values above into `.env.local`, restart the server

The Mail tab shows "mail ready" once the env vars are set. Use **Send test
first** before blasting the whole list.

**How it works:**
- **Send test first** — the Mail tab can send to one address before you blast
  everyone (recommended every time)
- Every email includes an unsubscribe link (token-signed, one click)
- Unsubscribed addresses stop receiving automatically
- Sent history (subject + recipient count) is kept in the console

> Deliverability: verifying your domain on Resend (SPF + DKIM records) is the
> single biggest upgrade for inbox placement — do it before your first real
> mail-out. Resend's dashboard shows delivery/bounce stats per send.

## Site editing (non-admin)

- **Styles/design** — `src/app/globals.css`
- **Pages** — `src/app/*/page.tsx`
- **Site copy, socials** — `content/site.json`
- **About page text, standards** — `content/about.json`
- **Hero/taglines** — `content/site.json`
- **Logo** — `public/images/biotek-logo.png` (white source). After replacing,
  run `npm run build:logo` to regenerate the green hero version + favicon.
- **OG share image** — edit `public/images/og.svg`, run `npm run build:og`

## Tech notes

- Auth: shared password → HMAC-signed session cookie (7 days), guarded by
  middleware at `/admin/console` + `/api/admin/*`
- Booking form posts to `/api/booking`, stored in the DB, visible in the
  console (honeypot spam trap included)
- Fonts self-hosted in `public/fonts`
- Embedded players are click-to-load facades (no third-party JS until play)
- Hero canvas pauses for `prefers-reduced-motion` and hidden tabs
- Events page emits JSON-LD (`schema.org/Event`)

## Scripts

```bash
npm run dev           # dev server
npm run build         # production build
npm run start         # production server
npm run lint          # eslint
npm run placeholders  # regenerate placeholder images + og.png
npm run build:og      # re-render og.png from og.svg
npm run build:logo    # regenerate green logo + favicon from biotek-logo.png
```
