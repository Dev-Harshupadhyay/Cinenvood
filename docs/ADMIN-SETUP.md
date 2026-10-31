# Admin access and YouTube trailers

## Password-only admin sign-in

The control room is at `/admin` and its separate sign-in page is `/admin/login`. Only a credentials session created with the configured admin email **and** password can access admin pages or admin APIs. Google login is for regular members; it does not grant administrator access, even when the same email is used.

Set these variables in Vercel → Project → Settings → Environment Variables → Production, then redeploy:

```env
ADMIN_EMAIL=the-admin-gmail-you-control
ADMIN_PASSWORD=choose-a-strong-secret
```

Use the requested initial credentials for this site, but replace the password with a unique, stronger secret before production if possible. The app deliberately has no hard-coded password fallback. Attempts are rate-limited per IP and account. Keep these values out of source code, screenshots, public documentation and commits.

Current local copy of the environment file is private/ignored by Git. Check that the exact Gmail used in `ADMIN_EMAIL` is the one intended for the admin username. Changing the value does not change a user's Google account; it changes which email can authenticate through the password form.

## Admin areas

The redesigned control room includes:

- Overview and site statistics
- Review/comment moderation, hide/publish/pin/delete
- Movie catalogue, feature/hide and trailer management
- Editorial/Jarvis review summaries grounded in published, non-spoiler Cinevood community reviews
- Member management
- Analytics and audit trail
- TMDB import and quick links

Members use `/dashboard` for their own profile, reviews and watchlist. Guests remain read-only.

## English + Hindi YouTube trailers

On a movie/series detail page, the **Trailer** action first checks TMDB's videos linked to that title (using the saved TMDB ID, or an exact title/year/type match). If TMDB has no YouTube trailer/teaser, the app can search YouTube directly. Saved English/Hindi trailer IDs remain the curated first choice; when a saved video is unavailable, **Find another trailer** opens the fallback finder. The player also links straight to the selected YouTube video if embedding is blocked.

Admin → **Titles** has separate English/Hindi trailer fields and a **Search YouTube API** action. Search results are suggestions: select the correct official trailer, then save. This avoids silently attaching the wrong video.

A TMDB-linked YouTube video can work with the existing server-side `TMDB_API_KEY`. For broader on-demand search and admin suggestions, create a YouTube Data API v3 key in Google Cloud Console, enable **YouTube Data API v3**, and add this server-only variable in Vercel:

```env
YOUTUBE_API_KEY=your-youtube-data-api-key
```

Redeploy afterward. The key is only used by server-side routes; it is never sent to the browser. If no YouTube key is configured and TMDB has no linked trailer, the title page still offers a direct YouTube search link. Manual YouTube URLs/video IDs can also be pasted and saved. `TMDB_API_KEY` remains separate and does not need to be changed for this feature if it is already configured.
