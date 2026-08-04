"""SupportPilot FastAPI application entry point."""
import logging
import os
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
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

# Component readiness — populated during lifespan startup
_status = {
    "mongodb":              False,
    "category_model":       False,
    "priority_model":       False,
    "sentence_transformer": False,
    "faiss":                False,
    "knowledge_base":       False,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    t0 = time.perf_counter()

    # ── MongoDB ───────────────────────────────────────────────────────────
    try:
        await connect_db()
        _status["mongodb"] = True
        logger.info("[Startup] MongoDB ready")
    except Exception as e:
        logger.error(f"[Startup] MongoDB failed: {e}")

    # ── ML models — validate with actual inference, not just file existence ──
    try:
        from ml.trainer import load_model
        from ml.preprocessor import clean_text
        _probe = clean_text("vpn problem not connecting")
        cat_m = load_model("category")
        cat_m.predict_proba([_probe])
        _status["category_model"] = True
        logger.info("[Startup] category_model ready (inference validated)")
    except Exception as e:
        logger.error(f"[Startup] category_model failed inference: {e}")
    try:
        from ml.trainer import load_model
        from ml.preprocessor import clean_text
        _probe = clean_text("vpn problem not connecting")
        pri_m = load_model("priority")
        pri_m.predict_proba([_probe])
        _status["priority_model"] = True
        logger.info("[Startup] priority_model ready (inference validated)")
    except Exception as e:
        logger.error(f"[Startup] priority_model failed inference: {e}")

    # ── FAISS index ───────────────────────────────────────────────────────
    try:
        load_index()
        from knowledge.faiss_index import is_ready
        if not is_ready():
            logger.info("[Startup] No FAISS index — building from knowledge_base/")
            from knowledge.search import index_knowledge_base
            index_knowledge_base()
        _status["faiss"] = is_ready()
        _status["knowledge_base"] = is_ready()
        logger.info(f"[Startup] FAISS ready: {_status['faiss']}")
    except Exception as e:
        logger.error(f"[Startup] FAISS failed: {e}")

    # ── SentenceTransformer warmup ────────────────────────────────────────
    try:
        from knowledge.embedder import warmup_model
        t_model = time.perf_counter()
        logger.info("[Startup] Loading SentenceTransformer…")
        await asyncio.to_thread(warmup_model)
        _status["sentence_transformer"] = True
        logger.info(f"[Startup] SentenceTransformer ready in {round((time.perf_counter()-t_model)*1000)}ms")
    except Exception as e:
        logger.error(f"[Startup] SentenceTransformer failed: {e}")

    logger.info(f"[Startup] All components ready in {round((time.perf_counter()-t0)*1000)}ms — status: {_status}")
    yield
    await close_db()


app = FastAPI(
    title="SupportPilot API",
    version="4.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw = os.getenv("ALLOWED_ORIGINS", "*").strip()
if _raw == "*":
    _origins = ["*"]
else:
    _origins = [o.strip().rstrip("/") for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ticket_router)
app.include_router(knowledge_router)
app.include_router(workflow_router)
app.include_router(escalation_router)


@app.get("/", response_class=PlainTextResponse)
async def root():
    return "SupportPilot AI Backend Running"


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health")
async def api_health():
    from knowledge.faiss_index import load_status, is_ready
    faiss_meta = load_status()
    # Refresh live FAISS state without rebuilding
    _status["faiss"] = is_ready()
    _status["knowledge_base"] = is_ready()
    all_ready = all(_status.values())
    return {
        "status":     "ok" if all_ready else "degraded",
        "version":    "4.0.0",
        "components": dict(_status),
        "faiss":      faiss_meta,
    }
