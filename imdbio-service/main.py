import hmac
import logging
import os
from typing import Any
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from imdbio import get_movie, get_reviews, search_title

logger = logging.getLogger(__name__)
app = FastAPI(title="Cinevood IMDbio Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else [],
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)

def authorize(authorization: str | None):
    expected = os.getenv("IMDBIO_SERVICE_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="Service authentication is not configured")
    if not hmac.compare_digest(authorization or "", f"Bearer {expected}"):
        raise HTTPException(status_code=401, detail="Unauthorized")

def serialize(value: Any):
    if value is None:
        return None
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {str(k): serialize(v) for k, v in value.items()}
    return jsonable_encoder(value)

@app.get("/health")
def health():
    return {"ok": True, "service": "imdbio"}

@app.get("/search")
async def search(q: str = Query(min_length=2, max_length=100), year: int | None = None,
                 authorization: str | None = Header(default=None)):
    authorize(authorization)
    try:
        result = await run_in_threadpool(search_title, q, year)
        return {"titles": serialize(result.titles if result else [])}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"IMDb search temporarily unavailable: {type(exc).__name__}")

@app.get("/diagnostics")
async def diagnostics(authorization: str | None = Header(default=None)):
    """Authenticated smoke test that verifies live IMDb search and title details."""
    authorize(authorization)
    try:
        result = await run_in_threadpool(search_title, "The Matrix", 1999)
        titles = result.titles if result else []
        if not titles:
            return JSONResponse({"ok": False, "stage": "search", "message": "IMDbio returned no title matches"}, status_code=503)
        first = titles[0]
        imdb_id = getattr(first, "imdbId", None) or getattr(first, "imdb_id", None)
        if not imdb_id:
            return JSONResponse({"ok": False, "stage": "search", "message": "IMDbio result did not include an IMDb ID"}, status_code=502)
        details = await run_in_threadpool(get_movie, imdb_id)
        if details is None:
            return JSONResponse({"ok": False, "stage": "details", "imdbId": imdb_id, "message": "IMDbio returned search results but no title details"}, status_code=503)
        return {
            "ok": True,
            "searchCount": len(titles),
            "sampleTitle": getattr(first, "title", None),
            "imdbId": imdb_id,
            "detailsFound": True,
            "titleDetails": {
                "title": getattr(details, "title", None),
                "year": getattr(details, "year", None),
                "rating": getattr(details, "rating", None)
            }
        }
    except Exception as exc:
        logger.exception("IMDbio diagnostics failed")
        return JSONResponse({"ok": False, "stage": "upstream", "message": f"IMDbio request failed: {type(exc).__name__}"}, status_code=502)

@app.get("/title/{imdb_id}")
async def title(imdb_id: str, authorization: str | None = Header(default=None)):
    authorize(authorization)
    if not imdb_id.startswith("tt") or not imdb_id[2:].isdigit():
        raise HTTPException(status_code=400, detail="Expected an IMDb title ID such as tt0133093")
    try:
        result = await run_in_threadpool(get_movie, imdb_id)
        if result is None:
            raise HTTPException(status_code=404, detail="IMDb title not found")
        return serialize(result)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"IMDb details temporarily unavailable: {type(exc).__name__}")

@app.get("/title/{imdb_id}/reviews")
async def reviews(imdb_id: str, authorization: str | None = Header(default=None)):
    authorize(authorization)
    if not imdb_id.startswith("tt") or not imdb_id[2:].isdigit():
        raise HTTPException(status_code=400, detail="Invalid IMDb title ID")
    try:
        result = await run_in_threadpool(get_reviews, imdb_id)
        return {"reviews": serialize(result or [])}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"IMDb reviews temporarily unavailable: {type(exc).__name__}")
