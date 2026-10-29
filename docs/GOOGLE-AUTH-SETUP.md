# Google sign-in — member accounts

CINE·MOOD uses Google OAuth for regular members. Members use their own dashboard to write reviews, like, comment and maintain a watchlist. **A Google session never grants admin access**; the control room uses a separate password-only session described in [`ADMIN-SETUP.md`](./ADMIN-SETUP.md).

## Google Cloud Console

The OAuth client must be a **Web application**. Add these authorized JavaScript origins:

```
https://cinenvood.vercel.app
https://cinemood.vercel.app
http://localhost:3000
```

Add the matching callback URLs:

```
https://cinenvood.vercel.app/api/auth/callback/google
https://cinemood.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

## Vercel variables

In Vercel → Project → Settings → Environment Variables, set the OAuth client values for Production and Preview:

```
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
```

Also set `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, and `NEXT_PUBLIC_SITE_URL=https://cinenvood.vercel.app`. Redeploy after changing environment variables.

## Sign in

Open `/login` → **Continue with Google**. Any real Google account becomes a normal member. The account's profile is stored in `cinemood."User"`; no fake or seeded member accounts are created.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `redirect_uri_mismatch` | Google Cloud callback differs from the site URL | Add the exact `/api/auth/callback/google` URL above |
| Google button is missing | `AUTH_GOOGLE_ID` or `AUTH_GOOGLE_SECRET` is absent | Add both to the matching Vercel environment and redeploy |
| Google user is sent to `/admin/login` from `/admin` | Expected: member Google sessions do not have admin rights | Use the separate password-only admin sign-in; see `ADMIN-SETUP.md` |

## Security notes

- Google accounts receive member access only. `ADMIN_EMAIL` by itself does **not** grant admin rights.
- The admin credential provider is limited to the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and login attempts are rate-limited.
- Reviews, likes, comments and watchlist entries use the database user's id. Sessions are JWT-based.
- Never commit OAuth secrets or `.env` files.
