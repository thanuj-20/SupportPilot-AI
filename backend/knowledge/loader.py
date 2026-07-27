"""
Document loader — extracts raw text from PDF, DOCX, TXT, and Markdown files.
Returns list of dicts: { filename, doc_type, page, text }
"""
import os
import logging

logger = logging.getLogger(__name__)

KB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base"))
SUPPORTED = {".pdf", ".docx", ".txt", ".md"}


def _load_pdf(path: str) -> list[dict]:
    import fitz  # pymupdf
    pages = []
    with fitz.open(path) as doc:
        for i, page in enumerate(doc):
            text = page.get_text().strip()
            if text:
                pages.append({"page": i + 1, "text": text})
    return pages


def _load_docx(path: str) -> list[dict]:
    from docx import Document
    doc = Document(path)
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [{"page": 1, "text": text}] if text else []


def _load_text(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read().strip()
    return [{"page": 1, "text": text}] if text else []


def load_documents() -> list[dict]:
    """Scan KB_DIR and return all extractable pages across all documents."""
    if not os.path.exists(KB_DIR):
        os.makedirs(KB_DIR, exist_ok=True)
        logger.warning(f"[Loader] knowledge_base/ folder created at {KB_DIR}")

    results = []
    files = [f for f in os.listdir(KB_DIR) if os.path.splitext(f)[1].lower() in SUPPORTED]
    logger.info(f"[Loader] Found {len(files)} document(s): {files}")
    print(f"[Loader] Found {len(files)} document(s): {files}")

    for fname in files:
        path = os.path.join(KB_DIR, fname)
        ext  = os.path.splitext(fname)[1].lower()
        try:
            if ext == ".pdf":
                pages = _load_pdf(path)
            elif ext == ".docx":
                pages = _load_docx(path)
            else:
                pages = _load_text(path)

            for p in pages:
                results.append({
                    "filename": fname,
                    "doc_type": ext.lstrip("."),
                    "page":     p["page"],
                    "text":     p["text"],
                })
            logger.info(f"[Loader] {fname} → {len(pages)} page(s)")
        except Exception as e:
            logger.error(f"[Loader] Failed to load {fname}: {e}")

    return results
