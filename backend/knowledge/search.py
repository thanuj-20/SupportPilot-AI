"""
Search service — orchestrates embed_query → FAISS search → format results.
All CPU-heavy embedding runs in a thread executor to avoid blocking the async event loop.
"""
import asyncio
import logging
import time
from knowledge.loader      import load_documents
from knowledge.chunker     import chunk_documents
from knowledge.embedder    import embed_texts, embed_query
from knowledge.faiss_index import build_index, search as faiss_search, load_status, is_ready

logger = logging.getLogger(__name__)


def index_knowledge_base() -> dict:
    """Full pipeline: load → chunk → embed → index."""
    pages  = load_documents()
    if not pages:
        return {"status": "no_documents", "total_documents": 0, "total_chunks": 0}

    chunks = chunk_documents(pages)
    texts  = [c["text"] for c in chunks]

    logger.info(f"[Search] Embedding {len(texts)} chunks…")
    embeddings = embed_texts(texts)

    build_index(chunks, embeddings)
    status = load_status()
    return {"status": "indexed", **status}


def _search_sync(query: str, top_k: int) -> list[dict]:
    """Blocking search: embed → FAISS lookup. Run via to_thread from async callers."""
    t0 = time.perf_counter()
    q_vec = embed_query(query)
    t1 = time.perf_counter()
    results = faiss_search(q_vec, top_k)
    t2 = time.perf_counter()
    logger.info(
        f"[Search] embed={round((t1-t0)*1000)}ms  faiss={round((t2-t1)*1000)}ms  "
        f"total={round((t2-t0)*1000)}ms  hits={len(results)}"
    )
    return [
        {
            "filename": r["filename"],
            "doc_type": r["doc_type"],
            "page":     r["page"],
            "chunk_id": r["chunk_id"],
            "score":    r["score"],
            "text":     r["text"],
        }
        for r in results
    ]


async def search_knowledge(query: str, top_k: int = 5) -> list[dict]:
    """Async wrapper: runs CPU-heavy embedding in thread pool, never blocks event loop."""
    if not is_ready():
        return []
    return await asyncio.to_thread(_search_sync, query, top_k)


def search_knowledge_sync(query: str, top_k: int = 5) -> list[dict]:
    """Sync version for use inside orchestrator (already runs in thread via workflow route)."""
    if not is_ready():
        return []
    return _search_sync(query, top_k)
