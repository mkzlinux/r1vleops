"""FastAPI application — serves the JSON API under /api and the built frontend
from backend/app/static (if present)."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from . import config
from .api import router as api_router
from .db import init_db

app = FastAPI(title="r1vleops Operations Desk", version="0.1.0")

# The dev Vite server proxies /api here, and cross-origin previews may call it
# directly, so allow any origin on the API surface.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/api/health")
def health():
    return {"ok": True}


app.include_router(api_router)

_index = config.STATIC_DIR / "index.html"
_assets = config.STATIC_DIR / "assets"


@app.get("/{full_path:path}")
def spa(full_path: str):
    """Serve the built SPA, falling back to index.html for client-side routes."""
    candidate = (config.STATIC_DIR / full_path).resolve()
    # Only serve files that actually live under the static dir.
    if str(candidate).startswith(str(config.STATIC_DIR.resolve())) and candidate.is_file():
        return FileResponse(candidate)
    if _index.is_file():
        return FileResponse(_index)
    return {
        "app": "r1vleops API is running.",
        "hint": "Build the frontend with `npm run build` (or use `make dev`) to get the UI.",
        "docs": "/docs",
    }
