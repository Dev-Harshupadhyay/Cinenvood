# Google sign-in — setup (once, ~6 minutes)

CINE·MOOD uses **Google OAuth only** in production. There is no password, no seeded account and no
"type this email to become admin" shortcut. This guide is the whole setup.

---

## 1. Create the OAuth client

1. Open <https://console.cloud.google.com> → create a project named **CineMood**.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `CINE·MOOD`, support email: your Gmail
   - Scopes: leave the defaults (`email`, `profile`, `openid`)
   - Test users: add your own Gmail while the app is in *Testing* (otherwise only listed accounts can sign in)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `CineMood web`

## 2. Add the URLs

**Authorised JavaScript origins**

```
https://cinemood.vercel.app
http://localhost:3000
```

**Authorised redirect URIs** (must match exactly — no trailing slash)

```
https://cinemood.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

## 3. Put the keys in Vercel

Copy the **Client ID** and **Client secret**, then in Vercel → Project → **Settings → Environment Variables**
add them for **Production + Preview**:

```
AUTH_GOOGLE_ID=xxxxxxxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
```

Plain lines. No quotes, no commas, no trailing spaces.

## 4. Point admin at your real Gmail

```
ADMIN_EMAIL=your.real@gmail.com
```

`ADMIN_EMAIL` decides who gets `role = ADMIN` on first sign-in. If it stays on a placeholder, the admin panel will
keep answering **403** and will tell you which email it is waiting for (`/admin-denied`).

## 5. Redeploy

Deployments → **… → Redeploy** with **“Use existing build cache” unchecked**. Env changes only apply to new builds.

## 6. Sign in

Open `/login` → **Continue with Google** → approve → you land back on the page you came from.
Your row appears in `cinemood."User"` immediately (name, email, photo, role, `createdAt`).

---

## How the data flows

```
Google → signIn() callback → prisma.user.upsert({ email, name, image, role: email === ADMIN_EMAIL ? 'ADMIN' : 'USER' })
                              ↓
                        jwt() re-reads role from Postgres
                              ↓
                        session() exposes { id, role } to the UI
```

- Reviews, likes, comments and watchlist rows all use `user.id` (the database id, not the Google one).
- The session is a JWT (30 days), so no session table is stored.
- Deleting your row in Supabase signs you out at the next token refresh.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `redirect_uri_mismatch` | URL in Google Cloud differs from the deployment URL | Add the exact `…/api/auth/callback/google` for that domain |
| Button missing on `/login` | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` empty in that environment | Add both, redeploy |
| Signed in but `/admin` says 403 | `ADMIN_EMAIL` ≠ your Gmail | Set it, redeploy, sign out and back in |
| Still 403 after matching | Old JWT still holds the previous role | Sign out fully, or wait for the token refresh |
| Works locally, fails on Vercel | Vercel env is per-project and per-environment | Add the vars to **Production** specifically |

## Security notes

- Local email sign-in only exists when `NODE_ENV !== 'production'` **and** Google keys are absent. It cannot run on Vercel.
- Sign-in traffic is rate-limited per IP (30 attempts / 10 minutes). Admin pages: 120 req/min. Admin actions: 60/min and
  600/hour. All limits are DB-backed, so a second serverless instance cannot bypass them.
- `AUTH_SECRET` must be a fresh random value: `openssl rand -base64 32`.
