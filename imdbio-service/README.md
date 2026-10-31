# Cinevood IMDbio service

This is a small Python HTTP service that exposes the upstream `imdbio` package to the Next.js application.

## Deploy on Render

Create a new **Web Service** from the Cinevood repository and configure:

- Root Directory: `imdbio-service`
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Set `IMDBIO_SERVICE_TOKEN` to a long random secret in the service environment. The Render blueprint in this folder can also be used as a starting point.

## Configure Cinevood

In the Next.js service environment, set:

- `IMDBIO_API_URL`: the deployed service base URL, e.g. `https://cinevood-imdbio.onrender.com`
- `IMDBIO_API_TOKEN`: exactly the same secret as `IMDBIO_SERVICE_TOKEN`
- `YOUTUBE_API_KEY`: YouTube Data API v3 key for embeddable trailer discovery

IMDbio uses IMDb's public website endpoints and can be affected by upstream changes, rate limits, or WAF challenges. The app degrades gracefully when the service is unavailable. Do not expose the service token or YouTube API key in browser code.
