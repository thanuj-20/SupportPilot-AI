"""Knowledge Base API routes — read-only, fixed 10 documents."""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from knowledge.search        import search_knowledge
from knowledge.faiss_index   import load_status, is_ready
from knowledge.rag_generator import generate_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


@router.get("/status", summary="Knowledge base index status")
async def kb_status():
    status = load_status()
    status["is_ready"] = is_ready()
    return status


@router.post("/search", summary="Semantic search over knowledge base")
async def kb_search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not is_ready():
        raise HTTPException(status_code=503, detail="Knowledge base index is not ready.")
    try:
        results = await search_knowledge(req.query.strip(), req.top_k)
        return {"query": req.query, "results": results}
    except Exception as e:
        logger.error(f"[KB] Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask", summary="RAG: retrieve + generate troubleshooting response")
async def kb_ask(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not is_ready():
        raise HTTPException(status_code=503, detail="Knowledge base index is not ready.")
    try:
        chunks   = await search_knowledge(req.query.strip(), max(req.top_k, 5))
        response = generate_response(req.query.strip(), chunks)
        return {"query": req.query, "response": response}
    except Exception as e:
        logger.error(f"[KB] RAG failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
