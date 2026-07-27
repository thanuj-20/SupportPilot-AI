"""SupportPilot FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import connect_db, close_db
from routes.ticket_routes import router as ticket_router
from routes.knowledge_routes import router as knowledge_router
from knowledge.faiss_index import load_index

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


app = FastAPI(title="SupportPilot API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ticket_router)
app.include_router(knowledge_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
