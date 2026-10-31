# Cinevood IMDbio service

This folder contains a small FastAPI service that runs the Python `imdbio` package. The Next.js app on Vercel calls this service over HTTPS because Vercel's Next.js runtime does not execute Python library code directly.

IMDbio itself does **not** require an IMDb API key. The service token below is only a private shared secret between your Vercel app and this Render service. The service pins `imdbio==0.0.9`; `0.0.8` used a plain HTTP client that IMDb's WAF can reject, while `0.0.9` uses a browser-impersonating client for IMDb requests.

## Deploy on Render (recommended: Blueprint)

The repository now has a root-level `render.yaml`, which Render can detect.

1. Push/merge this branch into the GitHub branch you want Render to deploy.
2. Open [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect the GitHub repository `Dev-Harshupadhyay/Cinenvood`.
5. Select the GitHub branch that contains `render.yaml`.
6. Render reads the root `render.yaml` and creates the `cinevood-imdbio` web service. Review the settings and apply.

The Blueprint config sets:

- Runtime: Python
- Root Directory: `imdbio-service`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health`
- Plan: Free (the service may spin down after inactivity and the first request can be slow)

### If you prefer creating a Web Service manually

1. Render Dashboard → **New +** → **Web Service**.
2. Connect `Dev-Harshupadhyay/Cinenvood` and choose the deployment branch.
3. Set **Root Directory** to `imdbio-service`.
4. Set **Runtime** to **Python**.
5. Set **Build Command** to `pip install -r requirements.txt`.
6. Set **Start Command** to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
7. Add an environment variable named `IMDBIO_SERVICE_TOKEN`. Generate a long random secret in Render (or use Render's Generate Value option if shown). Save it.
8. Create the service and wait for the deploy to finish.

After deployment, copy the service's public URL, for example `https://cinevood-imdbio.onrender.com`. Check `https://YOUR-RENDER-URL/health`; it should return JSON with `"ok": true`. This only confirms the web service is running. To verify IMDb is returning real data, call the authenticated smoke test from a trusted terminal:

```bash
curl -H "Authorization: Bearer $IMDBIO_SERVICE_TOKEN" \
  "https://YOUR-RENDER-URL/diagnostics"
```

A healthy response has `"ok": true`, a non-zero `searchCount`, and `"detailsFound": true`. The diagnostic tests a known title and never returns the service token.

## Configure the Vercel app

In Vercel → Cinevood project → **Settings** → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `IMDBIO_API_URL` | Your actual Render service URL, without a trailing slash |
| `IMDBIO_API_TOKEN` | The exact same secret value as Render's `IMDBIO_SERVICE_TOKEN` |
| `YOUTUBE_API_KEY` | A YouTube Data API v3 key, only for automatic trailer discovery/search |

Select the environments you use (Production, Preview, Development), save, then redeploy the Vercel project.

**Important:** `IMDBIO_API_TOKEN` is not an IMDb-issued token. You create it yourself and copy the same value to both services. Keep it server-side; do not prefix it with `NEXT_PUBLIC_`.

## YouTube trailer behaviour

The YouTube IFrame Player API can play a known YouTube video ID without an API key. However, finding a trailer automatically from a movie title requires YouTube Data API v3, so `YOUTUBE_API_KEY` is needed for the automatic discovery feature. Keep that key server-side too.

## Notes

- IMDbio uses IMDb's public endpoints and does not provide an official IMDb API. IMDb can change its endpoints, throttle requests, or block requests, so availability is not guaranteed.
- The Render free service may sleep when idle; the first request after sleep can take longer.
- Do not commit real tokens, API keys, or other secrets to GitHub.
