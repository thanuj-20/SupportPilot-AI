import sys; sys.path.insert(0,'.')
from knowledge.faiss_index import load_index
from knowledge.search import search_knowledge

load_index()
queries = [
    "VPN not connecting",
    "billing invoice incorrect charges",
    "server overheating critical",
    "return a product exchange",
    "new employee IT access setup",
    "service outage EMR network failure",
]
for q in queries:
    results = search_knowledge(q, top_k=1)
    if results:
        r = results[0]
        print(f"Q: {q}")
        print(f"   -> {r['filename']}  score={r['score']}")
        print(f"   {r['text'][:120]}...")
        print()
