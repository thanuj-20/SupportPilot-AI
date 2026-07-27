import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from knowledge.loader import load_documents
from knowledge.chunker import chunk_documents
from knowledge.embedder import embed_texts
from knowledge.faiss_index import build_index, load_status

pages  = load_documents()
chunks = chunk_documents(pages)
print(f"Total chunks to embed: {len(chunks)}")
embeddings = embed_texts([c["text"] for c in chunks])
build_index(chunks, embeddings)
status = load_status()
print(f"Index built successfully!")
print(f"Documents : {status['total_documents']}")
print(f"Chunks    : {status['total_chunks']}")
print(f"Indexed at: {status['last_indexed']}")
