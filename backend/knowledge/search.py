"""
Search service — orchestrates embed_query → FAISS search → format results.
Also exposes the full indexing pipeline.
"""
import logging
from knowledge.loader     import load_documents
from knowledge.chunker    import chunk_documents
from knowledge.embedder   import embed_texts, embed_query
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


def search_knowledge(query: str, top_k: int = 5) -> list[dict]:
    """Embed query and return top_k relevant chunks."""
    if not is_ready():
        return []

    q_vec   = embed_query(query)
    results = faiss_search(q_vec, top_k)

    return [
        {
            "filename":   r["filename"],
            "doc_type":   r["doc_type"],
            "page":       r["page"],
            "chunk_id":   r["chunk_id"],
            "score":      r["score"],
            "text":       r["text"],
        }
        for r in results
    ]
