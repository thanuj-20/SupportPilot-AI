"""
Embedder — loads sentence-transformers model and generates embeddings.
Singleton: model loaded once per worker, warmed up at startup.
"""
import logging
import os
import time
import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
_model = None


def get_model():
    """Return cached SentenceTransformer. Never call inside a request — use warmup_model() at startup."""
    global _model
    if _model is None:
        import torch
        from sentence_transformers import SentenceTransformer
        t0 = time.perf_counter()
        logger.info(f"[Embedder] Loading model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
        _model.eval()
        elapsed = round((time.perf_counter() - t0) * 1000)
        logger.info(f"[Embedder] Model loaded in {elapsed}ms (device: {_model.device})")
    return _model


def warmup_model():
    """Load model + run dummy encode so PyTorch init completes before first request."""
    import torch
    model = get_model()
    t0 = time.perf_counter()
    with torch.inference_mode():
        model.encode(["warmup"], batch_size=1, show_progress_bar=False, normalize_embeddings=True)
    elapsed = round((time.perf_counter() - t0) * 1000)
    logger.info(f"[Embedder] Warmup encode completed in {elapsed}ms")


def embed_texts(texts: list[str]) -> np.ndarray:
    """Return float32 numpy array of shape (N, 384). Use for bulk indexing only."""
    import torch
    model = get_model()
    with torch.inference_mode():
        embeddings = model.encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    return np.array(embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Return float32 numpy array of shape (1, 384). CPU-safe, batch_size=1."""
    import torch
    t0 = time.perf_counter()
    model = get_model()
    with torch.inference_mode():
        vec = model.encode([query], batch_size=1, show_progress_bar=False, normalize_embeddings=True)
    elapsed = round((time.perf_counter() - t0) * 1000)
    logger.info(f"[Embedder] Query embedded in {elapsed}ms")
    return np.array(vec, dtype=np.float32)
