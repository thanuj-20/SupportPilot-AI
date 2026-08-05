"""SupportPilot FastAPI application entry point."""
import logging
import os
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Response
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

_status = {
    "mongodb":              False,
    "category_model":       False,
    "priority_model":       False,
    "sentence_transformer": "not_loaded",   # string: not_loaded | ready
    "faiss":                False,
    "knowledge_base":       False,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    t0 = time.perf_counter()

    # ── MongoDB ───────────────────────────────────────────────────────────
    try:
        await connect_db()
        _status["mongodb"] = True
        logger.info("[Startup] MongoDB ready")
    except Exception as e:
        logger.error(f"[Startup] MongoDB failed: {e}")

    # ── ML models (inference validation) ─────────────────────────────────
    try:
        from ml.trainer import load_model
        from ml.preprocessor import clean_text
        _probe = clean_text("vpn problem not connecting")
        load_model("category").predict_proba([_probe])
        _status["category_model"] = True
        logger.info("[Startup] category_model ready")
    except Exception as e:
        logger.error(f"[Startup] category_model failed: {e}")

    try:
        from ml.trainer import load_model
        from ml.preprocessor import clean_text
        _probe = clean_text("vpn problem not connecting")
        load_model("priority").predict_proba([_probe])
        _status["priority_model"] = True
        logger.info("[Startup] priority_model ready")
    except Exception as e:
        logger.error(f"[Startup] priority_model failed: {e}")

    # ── FAISS index (load persisted, never rebuild at startup) ────────────
    try:
        load_index()
        from knowledge.faiss_index import is_ready
        _status["faiss"] = is_ready()
        _status["knowledge_base"] = is_ready()
        logger.info(f"[Startup] FAISS ready: {_status['faiss']}")
    except Exception as e:
        logger.error(f"[Startup] FAISS failed: {e}")

    logger.info(
        f"[Startup] Application ready in {round((time.perf_counter()-t0)*1000)}ms "
        "(SentenceTransformer warming up in background)"
    )

    # ── SentenceTransformer — warm up AFTER port is open (background task) ──
    import asyncio as _asyncio

    async def _warmup_st():
        try:
            from knowledge.embedder import get_model
            await _asyncio.to_thread(get_model)
            _status["sentence_transformer"] = "ready"
            logger.info("[Startup] SentenceTransformer ready")
        except Exception as e:
            logger.error(f"[Startup] SentenceTransformer failed: {e}")

    _asyncio.ensure_future(_warmup_st())

    yield
    await close_db()


app = FastAPI(
    title="SupportPilot API",
    version="4.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

_raw = os.getenv("ALLOWED_ORIGINS", "").strip()
if not _raw or _raw == "*":
    # No specific origins configured — allow all (credentials disabled for wildcard)
    _origins = ["*"]
    _allow_credentials = False
else:
    _origins = [o.strip().rstrip("/") for o in _raw.split(",") if o.strip()]
    _allow_credentials = True

logger.info(f"[CORS] Allowed origins: {_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(ticket_router)
app.include_router(knowledge_router)
app.include_router(workflow_router)
app.include_router(escalation_router)


@app.get("/", response_class=PlainTextResponse)
@app.head("/")
async def root():
    return PlainTextResponse("SupportPilot AI Backend Running")


@app.get("/health")
@app.head("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health")
async def api_health():
    from knowledge.faiss_index import load_status, is_ready
    from knowledge.embedder import is_model_loaded
    _status["faiss"] = is_ready()
    _status["knowledge_base"] = is_ready()
    _status["sentence_transformer"] = "ready" if is_model_loaded() else "not_loaded"
    # degraded only if hard components are false
    hard_ready = (
        _status["mongodb"] and
        _status["category_model"] and
        _status["priority_model"] and
        _status["faiss"]
    )
    return {
        "status":     "ok" if hard_ready else "degraded",
        "version":    "4.0.0",
        "components": dict(_status),
        "faiss":      load_status(),
    }
