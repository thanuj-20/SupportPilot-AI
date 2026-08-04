"""
Embedder — lazy singleton SentenceTransformer.
Model loads on first search request, never at startup.
Thread-safe: lock prevents duplicate instantiation on concurrent first requests.
"""
import logging
import os
import threading
import time
import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
_model = None
_lock  = threading.Lock()


def is_model_loaded() -> bool:
    return _model is not None


def get_model():
    """Return cached SentenceTransformer, loading it lazily on first call."""
    global _model
    if _model is not None:
        return _model
    with _lock:
        # Double-checked locking: another thread may have loaded while we waited
        if _model is not None:
            return _model
        import torch
        from sentence_transformers import SentenceTransformer
        t0 = time.perf_counter()
        logger.info(f"[Embedder] Lazy-loading model: {MODEL_NAME}")
        m = SentenceTransformer(MODEL_NAME)
        m.eval()
        elapsed = round((time.perf_counter() - t0) * 1000)
        logger.info(f"[Embedder] Model loaded in {elapsed}ms (device: {m.device})")
        _model = m
    return _model


def embed_texts(texts: list[str]) -> np.ndarray:
    """Bulk embed for indexing. Returns float32 (N, 384)."""
    import torch
    model = get_model()
    with torch.inference_mode():
        embeddings = model.encode(
            texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True
        )
    return np.array(embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Embed a single query. Returns float32 (1, 384)."""
    import torch
    t0 = time.perf_counter()
    model = get_model()
    with torch.inference_mode():
        vec = model.encode(
            [query], batch_size=1, show_progress_bar=False, normalize_embeddings=True
        )
    elapsed = round((time.perf_counter() - t0) * 1000)
    logger.info(f"[Embedder] Query embedded in {elapsed}ms")
    return np.array(vec, dtype=np.float32)
