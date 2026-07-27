"""
Embedder — loads sentence-transformers model and generates embeddings.
Model: all-MiniLM-L6-v2 (384-dim, fast, good quality).
Singleton pattern so the model is loaded only once.
"""
import logging
import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"[Embedder] Loading model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("[Embedder] Model loaded.")
    return _model


def embed_texts(texts: list[str]) -> np.ndarray:
    """Return float32 numpy array of shape (N, 384)."""
    model = get_model()
    embeddings = model.encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    return np.array(embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Return float32 numpy array of shape (1, 384)."""
    return embed_texts([query])
