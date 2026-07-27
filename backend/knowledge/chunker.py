"""
Text chunker — splits page text into overlapping chunks.
Chunk size: 500 chars, overlap: 100 chars.
Returns list of dicts ready for embedding.
"""
import logging

logger = logging.getLogger(__name__)

CHUNK_SIZE    = 500
CHUNK_OVERLAP = 100


def chunk_documents(pages: list[dict]) -> list[dict]:
    """
    Input : list of { filename, doc_type, page, text }
    Output: list of { filename, doc_type, page, chunk_id, text }
    """
    chunks = []
    chunk_id = 0

    for page in pages:
        text = page["text"].strip()
        if not text:
            continue

        start = 0
        while start < len(text):
            end   = start + CHUNK_SIZE
            chunk = text[start:end].strip()
            if chunk:
                chunks.append({
                    "chunk_id": chunk_id,
                    "filename": page["filename"],
                    "doc_type": page["doc_type"],
                    "page":     page["page"],
                    "text":     chunk,
                })
                chunk_id += 1
            start += CHUNK_SIZE - CHUNK_OVERLAP

    logger.info(f"[Chunker] {len(pages)} page(s) → {len(chunks)} chunk(s)")
    return chunks
