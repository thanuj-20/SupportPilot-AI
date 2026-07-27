"""
FAISS index manager.
Stores: FAISS flat index (cosine via normalised vectors + inner product)
        + metadata list (parallel array to index rows)
        + last_indexed timestamp
Persists to backend/knowledge/faiss_store/
"""
import os
import json
import logging
import pickle
from datetime import datetime, timezone

import numpy as np

logger = logging.getLogger(__name__)

STORE_DIR   = os.path.join(os.path.dirname(__file__), "faiss_store")
INDEX_PATH  = os.path.join(STORE_DIR, "index.faiss")
META_PATH   = os.path.join(STORE_DIR, "metadata.pkl")
STATUS_PATH = os.path.join(STORE_DIR, "status.json")

os.makedirs(STORE_DIR, exist_ok=True)

# In-memory state
_index    = None
_metadata = []   # list of chunk dicts (without embedding)


def _save_status(n_docs: int, n_chunks: int):
    status = {
        "total_documents": n_docs,
        "total_chunks":    n_chunks,
        "last_indexed":    datetime.now(timezone.utc).isoformat(),
    }
    with open(STATUS_PATH, "w") as f:
        json.dump(status, f, indent=2)


def load_status() -> dict:
    if not os.path.exists(STATUS_PATH):
        return {"total_documents": 0, "total_chunks": 0, "last_indexed": None}
    with open(STATUS_PATH) as f:
        return json.load(f)


def build_index(chunks: list[dict], embeddings: np.ndarray):
    """Build FAISS index from chunks + their embeddings, then persist."""
    import faiss
    global _index, _metadata

    dim = embeddings.shape[1]
    # Inner product on L2-normalised vectors == cosine similarity
    _index = faiss.IndexFlatIP(dim)
    _index.add(embeddings)

    _metadata = [{k: v for k, v in c.items() if k != "embedding"} for c in chunks]

    # Persist
    faiss.write_index(_index, INDEX_PATH)
    with open(META_PATH, "wb") as f:
        pickle.dump(_metadata, f)

    n_docs = len({c["filename"] for c in chunks})
    _save_status(n_docs, len(chunks))
    logger.info(f"[FAISS] Index built: {n_docs} docs, {len(chunks)} chunks.")


def load_index():
    """Load persisted index into memory (called at startup)."""
    import faiss
    global _index, _metadata

    if os.path.exists(INDEX_PATH) and os.path.exists(META_PATH):
        _index = faiss.read_index(INDEX_PATH)
        with open(META_PATH, "rb") as f:
            _metadata = pickle.load(f)
        logger.info(f"[FAISS] Loaded index: {_index.ntotal} vectors, {len(_metadata)} chunks.")
    else:
        logger.info("[FAISS] No persisted index found.")


def search(query_vec: np.ndarray, top_k: int = 5) -> list[dict]:
    """Return top_k results with score + metadata."""
    if _index is None or _index.ntotal == 0:
        return []

    k = min(top_k, _index.ntotal)
    scores, indices = _index.search(query_vec, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:
            continue
        meta = _metadata[idx].copy()
        meta["score"] = round(float(score), 4)
        results.append(meta)
    return results


def is_ready() -> bool:
    return _index is not None and _index.ntotal > 0
