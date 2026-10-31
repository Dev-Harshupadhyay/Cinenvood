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

The home hero and movie detail page show a **Watch trailer** button once a trailer is saved. The player offers English/Hindi tabs when both are available. Admin → **Titles** has trailer fields for each movie and a **Search YouTube API** action. Search results are suggestions: select the correct official trailer, then save. This avoids silently attaching the wrong video.

Create a YouTube Data API v3 key in Google Cloud Console, enable **YouTube Data API v3**, and add this server-only variable in Vercel:

```env
YOUTUBE_API_KEY=your-youtube-data-api-key
```

Redeploy afterward. The key is only used by the server-side admin search route; it is never sent to the browser. If no key is configured, manual YouTube URLs/video IDs can still be pasted and saved. The existing `TMDB_API_KEY` is separate and does not need to be changed.
