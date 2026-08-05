import { useState, useEffect } from "react";
import axios from "axios";
import { getKBStatus, searchKnowledge, ragKnowledge } from "../services/api";
import KnowledgeResultCard from "../components/KnowledgeResultCard";
import RAGResponseCard     from "../components/RAGResponseCard";
import ArticleModal        from "../components/ArticleModal";

const HEALTH_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/api$/, "/health");

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

function StatCard({ title, value, icon, highlight, small }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-2 ${
      highlight ? "bg-green-900/20 border-green-700" : "bg-gray-900 border-gray-700"
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <p className={`font-bold ${small ? "text-base" : "text-3xl"} ${
        highlight ? "text-green-400" : "text-white"
      }`}>
        {value}
      </p>
    </div>
  );
}

export default function KnowledgeBase() {
  const [status,      setStatus]      = useState(null);
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [ragResult,   setRagResult]   = useState(null);
  const [searching,   setSearching]   = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [error,       setError]       = useState("");
  const [modalResult, setModalResult] = useState(null);
  const [modalQuery,  setModalQuery]  = useState("");

  useEffect(() => {
    getKBStatus()
      .then(r => setStatus(r.data))
      .catch(() => setError("Cannot reach backend."));
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    setRagResult(null);
    setSearched(false);
    // Wake backend if sleeping
    try { await axios.get(HEALTH_URL, { timeout: 30000 }); } catch (_) {}
    try {
      const [searchRes, ragRes] = await Promise.all([
        searchKnowledge(query.trim(), 5),
        ragKnowledge(query.trim(), 5),
      ]);
      setResults(searchRes.data.results);
      setRagResult(ragRes.data.response);
      setSearched(true);
    } catch (e) {
      setError(e.response?.data?.detail || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const openModal = (result) => {
    setModalResult(result);
    setModalQuery(query);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
        <p className="text-gray-400 text-sm mt-1">
          Semantic search across 10 enterprise knowledge documents · Powered by FAISS + Sentence Transformers
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠</span>{error}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Documents"    value={status?.total_documents ?? "—"} icon="📚" />
        <StatCard title="Chunks"       value={status?.total_chunks    ?? "—"} icon="🧩" />
        <StatCard
          title="Index Status"
          value={status?.is_ready ? "Ready" : "—"}
          icon={status?.is_ready ? "✅" : "⏳"}
          highlight={status?.is_ready}
        />
        <StatCard
          title="Last Indexed"
          value={status?.last_indexed ? new Date(status.last_indexed).toLocaleDateString() : "—"}
          icon="🕐"
          small
        />
      </div>

      {/* ── Search box ── */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Search Knowledge Base</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="e.g. VPN not connecting, billing invoice, server overheating…"
            className="flex-1 bg-gray-800 border border-gray-600 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {searching ? <Spinner /> : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
              </svg>
            )}
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* ── RAG Response ── */}
      {searched && ragResult && (
        <RAGResponseCard
          response={ragResult}
          query={query}
          onViewSource={openModal}
        />
      )}

      {/* ── Search results ── */}
      {searched && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{results.length}</span> relevant article{results.length !== 1 ? "s" : ""} found for{" "}
              <span className="text-blue-400 font-medium">"{query}"</span>
            </p>
          </div>
          {results.map((r, i) => (
            <KnowledgeResultCard
              key={`${r.chunk_id}-${i}`}
              result={r}
              rank={i + 1}
              query={query}
              onViewFull={openModal}
            />
          ))}
        </div>
      )}

      {/* ── No results ── */}
      {searched && results.length === 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">No relevant knowledge article found.</p>
            <p className="text-gray-400 text-sm mt-1">Please try different keywords.</p>
          </div>
        </div>
      )}

      {/* ── Initial prompt ── */}
      {!searched && !searching && (
        <div className="text-center py-16 space-y-3">
          <svg className="w-14 h-14 mx-auto text-gray-700" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
          </svg>
          <p className="text-gray-500 text-sm">Enter a query above to search the knowledge base</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {["VPN connection issue", "billing invoice", "server overheating", "password reset", "return policy"].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); }}
                className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900 px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Article Modal ── */}
      {modalResult && (
        <ArticleModal
          result={modalResult}
          query={modalQuery}
          onClose={() => setModalResult(null)}
        />
      )}
    </div>
  );
}
