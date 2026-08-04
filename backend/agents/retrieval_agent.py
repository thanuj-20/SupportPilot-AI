"""
Retrieval Agent
Responsibility: semantic search over the existing FAISS knowledge base.
Uses search_knowledge_sync — safe because orchestrator runs in asyncio.to_thread.
"""
import logging
import time
from datetime import datetime, timezone
from knowledge.search import search_knowledge_sync

logger = logging.getLogger(__name__)


def run(diagnosis: dict, subject: str, body: str, top_k: int = 5) -> dict:
    query = f"{subject} {body} {diagnosis['category']}".strip()
    t0 = time.perf_counter()
    chunks = search_knowledge_sync(query, top_k)
    elapsed = round((time.perf_counter() - t0) * 1000)
    logger.info(f"[RetrievalAgent] {diagnosis['ticket_id']} → {len(chunks)} chunks in {elapsed}ms")
    return {
        "agent":       "RetrievalAgent",
        "ticket_id":   diagnosis["ticket_id"],
        "query":       query,
        "chunks":      chunks,
        "top_k":       top_k,
        "duration_ms": elapsed,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "status":      "completed" if chunks else "no_results",
    }
