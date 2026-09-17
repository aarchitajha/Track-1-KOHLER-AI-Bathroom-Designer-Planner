"""
KOHLER AI Bathroom Designer & Planner - FastAPI Backend
Implements PRD §7.1 & §8 API contract:
- /api/catalog
- /api/optimize
- /api/chat
- /api/export
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.routers import catalog, optimize, chat, export, vision, history
from backend.db.session import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    stream=sys.stderr,
    force=True,
)
logger = logging.getLogger("kohler")


from backend.services.llm import warmup_llm

@asynccontextmanager
async def lifespan(app: FastAPI):
    mode = settings.require_llm_configured()
    logger.info(f"[Startup] LLM engine verified (mode={mode}) — chat will use real LLM, not canned fallbacks.")
    try:
        await warmup_llm()
    except Exception as e:
        logger.warning(f"[Startup] LLM warm-up skipped / non-blocking notice: {e}")
    yield


# Initialize database schema on startup
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for the KOHLER AI Bathroom Designer & Planner",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "code": 500,
            "message": str(exc)
        }
    )


app.include_router(catalog.router)
app.include_router(optimize.router)
app.include_router(chat.router)
app.include_router(export.router)
app.include_router(vision.router)
app.include_router(history.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "llm_configured": settings.is_llm_configured(),
        "llm_mode": settings.get_llm_mode(),
        "endpoints": [
            "/api/catalog",
            "/api/optimize",
            "/api/chat",
            "/api/export",
            "/api/vision-dimensions",
            "/docs"
        ]
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "llm_configured": settings.is_llm_configured(),
        "llm_mode": settings.get_llm_mode(),
    }
