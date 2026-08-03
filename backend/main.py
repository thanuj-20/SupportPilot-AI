"""SupportPilot FastAPI application entry point."""
import logging
import os
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    load_index()  # load persisted FAISS index if available
    from knowledge.faiss_index import is_ready
    if not is_ready():
        from knowledge.search import index_knowledge_base
        logging.getLogger(__name__).info("[Startup] No FAISS index found — building from knowledge_base/…")
        index_knowledge_base()
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


@app.get("/health")
async def health():
    return {"status": "ok"}
