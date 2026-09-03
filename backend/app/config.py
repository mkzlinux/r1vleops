"""Central configuration.

Everything is overridable via environment variables so the same codebase runs
locally, in a preview, or in production without edits.
"""
from __future__ import annotations

import os
from pathlib import Path

# Backend package dir: backend/app
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_DIR = BACKEND_DIR.parent

# The DB lives outside the package so schema resets are easy to reason about.
DATA_DIR = Path(os.environ.get("R1VLEOPS_DATA_DIR", BACKEND_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path(os.environ.get("R1VLEOPS_DB", DATA_DIR / "r1vleops.db"))

# Which brain powers the crew: "mock" (default, zero keys) | "openai"
LLM_BACKEND = os.environ.get("R1VLEOPS_LLM", "mock").lower()
OPENAI_MODEL = os.environ.get("R1VLEOPS_OPENAI_MODEL", "gpt-4o-mini")

# Where the built frontend lives (FastAPI serves it from here).
STATIC_DIR = APP_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

COMPANY_NAME = os.environ.get("R1VLEOPS_COMPANY", "r1vleops")
COMPANY_TAGLINE = os.environ.get("R1VLEOPS_TAGLINE", "One founder. A whole crew.")
