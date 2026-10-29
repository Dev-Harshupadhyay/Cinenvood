# Round 5 — what shipped

Short changelog for the “admin, data, scale” round. Detailed plan with screenshots lives in
[`CineMood-Round5-Plan.pdf`](./CineMood-Round5-Plan.pdf) (Hinglish).

## Data
- **270 titles** imported with TMDB metadata (poster, backdrop, cast, director, runtime, genres, score).
- **9 legacy reviews** from the old Vite app (`public.admin_reviews`) imported as **editorial** reviews —
  `userId = NULL`, `editorial = true`, `authorName = "CiNEMAsFLiX"`. No fake accounts were created.
- **Zero seeded users**: the demo accounts and their 24 reviews/comments/likes were deleted.
- `prisma/import.mjs` (`npm run db:import`) reproduces the whole import; it only touches the `cinemood` schema.

## Access
- Google-only sign-in in production; the local email form is dev-only and compiled out.
- `ADMIN_EMAIL` decides the admin role; `/admin-denied` explains exactly which email is expected.
- Guest mode: `localStorage["cm-guest-id"]`, read-only, hashed before it reaches the database.

## Admin
- 7 tabs: Overview, Moderation, Titles, Users, **Analytics**, **Activity log**, TMDB import.
- `AdminLog` audit trail for every mutation (actor, action, target, value, timestamp).
- `PageView`-backed analytics: 14-day chart, top pages, top titles, devices, referrers, guests vs members.

## Safety
- Two-layer rate limiting (memory + Postgres) on admin pages, admin actions, auth, reviews, comments, likes, tracking.
- 429 responses with `Retry-After`; friendly `/rate-limited` screen instead of a crash.
- Bot/preview user-agents excluded from analytics.

## SEO
- JSON-LD: WebSite + SearchAction, Organization, Movie (+ real aggregateRating only), Review, BreadcrumbList.
- Canonical URLs, OpenGraph/Twitter cards, dynamic sitemap, robots rules for private routes.

## Mobile
- App-style bottom tab bar ≤900px, chip rails, scroll-contained tables, safe-area padding.
- Verified 0px horizontal overflow at 390×844 on `/`, `/movies`, `/reviews`, `/community`, `/admin`.

## New environment variables
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — see [`GOOGLE-AUTH-SETUP.md`](./GOOGLE-AUTH-SETUP.md).
