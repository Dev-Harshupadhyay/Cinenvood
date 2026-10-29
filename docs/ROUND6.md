# Round 6 — stability, bilingual verdicts, premium review & cast UI

**Shipped:** 2026-10-29 · builds on Round 5 (`eb0cdda`)

Round 5 made the platform *real* (catalogue, admin, auth, guests). Round 6 made it **trustworthy on a live URL** and
made the review surface look like a publication instead of a feed.

---

## 1. "Server-side exception" — root cause and fix

The live 500s were never a rendering bug. Two things were happening:

| What we saw | What it actually was | Fix |
| --- | --- | --- |
| `Application error: a server-side exception has occurred (digest 1194572597)` | Prisma threw mid-render when the Supabase **pooler dropped an idle connection** (`Connection reset by peer`, `P1017`). No error boundary existed, so the whole route died. | `lib/prisma.ts` now retries transient errors (140 ms → 320 ms) before failing; `app/error.tsx` + `app/global-error.tsx` render a branded retry card instead. |
| Stale/incomplete pages during a blip | One failing query took the entire page with it. | `lib/safe.ts` (`settle`, `settleAll`) + `components/DataBanner.tsx`: the shell always paints, the missing section shows a small banner. |
| No way to see *why* on the deployed box | Env/schema problems were invisible. | `GET /api/health` (503 on any failure) and `/status` page: env vars, `SELECT 1`, tables, columns, row counts, region, commit. |

Also fixed: the `[data] Dynamic server usage` build warnings — `settle()` used to swallow Next.js' control-flow
digests (`DYNAMIC_SERVER_USAGE`, `NEXT_REDIRECT`, `NEXT_NOT_FOUND`). It now re-throws them.

**Where the old site was coming from:** `cinemood.vercel.app` is the *legacy Vite SPA* project (it serves `/assets/index-*.js`
and a blank `#root`). The Next.js app lives on `cinenvood.vercel.app`. The digest error was the Next deployment on a bad
DB connection, not the Vite one. Both are now documented so the domain can be pointed at the right project.

---

## 2. Reviews, per visitor location

New columns on `Review`: **`headlineEn`**, **`bodyEn`** — the same verdict, written twice (Hinglish + English), not
machine-translated. All 9 legacy verdicts were translated and pushed to Supabase (`prisma/legacy-en.json` →
`prisma/apply-en.mjs`, which also strips the duplicated title line from the Hinglish body).

`lib/edition.ts` decides per request:

```
cookie cm-edition ("en" | "hi", 1 year)
  → x-vercel-ip-country / cf-ipcountry   (IN, NP, BD, PK, LK, AE, SG, MY = Hinglish)
  → Accept-Language (hi…)                → default "en"
```

`editionOf(review, edition)` returns `{ headline, body, translated, hasEn, hasHi, original }` so cards and the detail
page stay honest: when the English copy is being shown to an Indian reader (or vice-versa) a small
**EN EDITION · original in Hinglish** chip appears under the headline.

The `EditionSwitch` pill is wired into `/`, `/movies`, `/movies/[slug]`, `/reviews`, `/reviews/[id]`, `/community`
and `/dashboard`.

---

## 3. Review section, rebuilt as a publication

- **Byline**: avatar → *Harsh* (serif) → `EDITORIAL · CiNEMAsFLiX` chip → time → edition chip. Rating sits in its own
  badge so it can't collide with the name.
- **Typography**: Instrument Serif headlines (`clamp(23→31px)`), drop-cap first letter, 15.2 px / 1.82 body, generous
  spacing, "— Harsh" signature in the footer.
- **Feed card**: body clamps to 7 lines with **Read full verdict →**; card keeps a poster row, pinned flag and like/comment
  counts.
- **`/reviews`** got a right rail: Editor's pick, Highest rated (live from the catalogue), and a short "how editions work"
  note. Collapses to a stacked grid under 1080 px.

---

## 4. Cast photos → richer film pages

`prisma/cast-photos.mjs` scrapes each TMDB page's `<ol class="people scroller">` cards
(`li.card` → name, character, `w138_and_h175_face` photo), writes `prisma/cast-photos.json`
(**266 titles / 1833 photos**), and `--apply` writes them into `Title.cast` (JSONB).

> Gotcha that cost a run: `cast` is a Postgres keyword — the column must be written as `"cast"`, otherwise
> `UPDATE … SET cast = $2::jsonb` fails with `42601 syntax error`.

Film pages now show a `.cast-grid` of circular portraits, name + character, 5 per row on desktop, 2 per row on mobile.

---

## 5. Editorial panel (admin)

`/admin?tab=editorial` — a proper editor, not a JSON blob:

- pick any published title (searchable select), rating 1–10, Hinglish headline + body, English headline + body,
  pin-as-verdict checkbox;
- publish / update / delete, all through `POST /api/admin/editorial` (admin-only, rate-limited, `AdminLog` row per write);
- the table below flags verdicts whose **English edition is missing**, so translation debt is visible.

Because editorial verdicts are `editorial = true` with `authorName = "Harsh"`, they render without any user account —
satisfying "no fake users" while still being credited.

---

## 6. Extras

- **Premium fonts**: Instrument Serif (display), Poppins (UI), Outfit (buttons/labels), IBM Plex Mono (meta) — self-hosted
  through `next/font`, so no layout shift and no third-party font request.
- **Guest mode**: `cm-guest-id` in `localStorage`, read-only, with a `GuestNote` explaining what needs an account.
- **Rate limits** already in Round 5 now cover the new surface too: admin actions 60/min + 600/h, editorial writes,
  reviews 6/15 min, comments 10/10 min, likes 45/min, sign-in 30/10 min, tracking 200/min.
- **Analytics**: `/api/track` writes cookie-less `PageView` rows (hashed visitor key, device, lang, referrer); the admin
  Analytics tab reads them back.

---

## Files touched

```
prisma/schema.prisma          + Review.headlineEn / bodyEn, Title.tmdbScore
prisma/legacy-en.json         English editions of the 9 verdicts
prisma/apply-en.mjs           writes EN copy, cleans the Hinglish body
prisma/cast-photos.mjs        TMDB cast scrape (--fetch / --apply)
prisma/cast-photos.json       266 titles · 1833 portraits
lib/edition.ts                IP/cookie/language edition resolver
lib/safe.ts                   settle(), settleAll() — degrade, don't die
lib/health.ts                 shared health checks
lib/prisma.ts                 transient-error retry
app/api/health/route.ts       GET /api/health (503 on failure)
app/api/admin/editorial/…     editorial CRUD (admin + rate-limited)
app/status/page.tsx           human-readable diagnostics
app/error.tsx, global-error   branded error cards
components/EditionSwitch.tsx  EN / Hinglish pill
components/EditorialEditor.tsx admin editorial UI
components/DataBanner.tsx     "live data unavailable" strip
components/ReviewCard.tsx     premium card rewrite
components/GuessNote.tsx      guest read-only note
app/globals.css               premium byline, clamp, rail, cast grid, guest note
```

## Verify it

```bash
npx tsc --noEmit && npx next build
curl -s localhost:3000/api/health | jq '.ok'
curl -s -H 'Cookie: cm-edition=en' localhost:3000/reviews | grep -c "EN edition"
curl -s -H 'x-vercel-ip-country: IN' localhost:3000/reviews | grep -c "EDITORIAL"
```
