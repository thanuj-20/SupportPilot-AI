"""
Retrieval Agent
Responsibility: semantic search over the existing FAISS knowledge base
using the diagnosis output as the query. Single responsibility.
"""
import logging
from datetime import datetime, timezone
from knowledge.search import search_knowledge

logger = logging.getLogger(__name__)


def run(diagnosis: dict, subject: str, body: str, top_k: int = 5) -> dict:
    """
    Input : diagnosis dict, original subject + body
    Output: retrieval dict with top-k knowledge chunks
    """
    query = f"{subject} {body} {diagnosis['category']}".strip()
    chunks = search_knowledge(query, top_k)

    result = {
        "agent":     "RetrievalAgent",
        "ticket_id": diagnosis["ticket_id"],
        "query":     query,
        "chunks":    chunks,
        "top_k":     top_k,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status":    "completed" if chunks else "no_results",
    }
    logger.info(f"[RetrievalAgent] {diagnosis['ticket_id']} → {len(chunks)} chunks retrieved")
    return result
