"""SupportPilot FastAPI application entry point."""
import logging
import os
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import connect_db, close_db
from routes.ticket_routes import router as ticket_router
from routes.knowledge_routes import router as knowledge_router
from routes.workflow_routes import router as workflow_router
from routes.escalation_routes import router as escalation_router
from knowledge.faiss_index import load_index

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Track startup component status for /api/health
_startup_status = {
    "mongodb":          False,
    "ml_models":        False,
    "sentence_transformer": False,
    "faiss":            False,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    t_total = time.perf_counter()

    # ── MongoDB ───────────────────────────────────────────────────────────
    await connect_db()
    _startup_status["mongodb"] = True
    logger.info("[Startup] MongoDB ready")

    # ── ML models (check saved models exist) ─────────────────────────────
    import os as _os
    models_dir = _os.path.join(_os.path.dirname(__file__), "ml", "saved_models")
    if _os.path.exists(_os.path.join(models_dir, "category_model.pkl")):
        _startup_status["ml_models"] = True
        logger.info("[Startup] ML models ready")
    else:
        logger.warning("[Startup] ML models not found — run train_offline.py")

    # ── FAISS index ───────────────────────────────────────────────────────
    load_index()
    from knowledge.faiss_index import is_ready
    if not is_ready():
        logger.info("[Startup] No FAISS index found — building from knowledge_base/…")
        from knowledge.search import index_knowledge_base
        index_knowledge_base()
    _startup_status["faiss"] = is_ready()
    logger.info(f"[Startup] FAISS ready: {_startup_status['faiss']}")

    # ── SentenceTransformer warmup (blocking but happens before requests) ─
    import asyncio
    t_model = time.perf_counter()
    logger.info("[Startup] Loading SentenceTransformer model…")
    try:
        from knowledge.embedder import warmup_model
        await asyncio.to_thread(warmup_model)
        _startup_status["sentence_transformer"] = True
        logger.info(f"[Startup] SentenceTransformer ready in {round((time.perf_counter()-t_model)*1000)}ms")
    except Exception as e:
        logger.error(f"[Startup] SentenceTransformer failed to load: {e}")

    logger.info(f"[Startup] All components ready in {round((time.perf_counter()-t_total)*1000)}ms")
    yield
    await close_db()


app = FastAPI(title="SupportPilot API", version="4.0.0", lifespan=lifespan)

_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in _origins_env.split(",")] if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ticket_router)
app.include_router(knowledge_router)
app.include_router(workflow_router)
app.include_router(escalation_router)


@app.get("/")
async def root():
    return {"status": "online", "service": "SupportPilot AI API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health")
async def api_health():
    from knowledge.faiss_index import load_status, is_ready
    faiss_status = load_status()
    kb_ready = is_ready()
    components = {
        **_startup_status,
        "knowledge_base": kb_ready,
    }
    all_ready = all(components.values())
    return {
        "status":     "ok" if all_ready else "degraded",
        "version":    "4.0.0",
        "components": components,
        "faiss":      faiss_status,
    }
