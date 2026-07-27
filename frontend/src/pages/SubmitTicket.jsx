import { useState } from "react";
import { submitTicket, searchKnowledge } from "../services/api";
import { useNavigate } from "react-router-dom";
import KnowledgeResultCard from "../components/KnowledgeResultCard";

const SEVERITY_COLOR = {
  Critical: "text-red-300",
  High:     "text-orange-400",
  Medium:   "text-yellow-300",
  Low:      "text-green-400",
};
const PRIORITY_COLOR = {
  high:   "text-red-300",
  medium: "text-yellow-300",
  low:    "text-green-400",
};

export default function SubmitTicket() {
  const [subject,    setSubject]    = useState("");
  const [body,       setBody]       = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [kbResults,  setKbResults]  = useState([]);
  const [kbLoading,  setKbLoading]  = useState(false);
  const [kbSearched, setKbSearched] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await submitTicket(subject, body);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Submission failed. Train models first.");
    } finally {
      setLoading(false);
    }
  };

  const handleFindKnowledge = async () => {
    const q = `${subject} ${body}`.trim();
    if (!q) return;
    setKbLoading(true);
    setKbResults([]);
    setKbSearched(false);
    try {
      const res = await searchKnowledge(q, 5);
      setKbResults(res.data.results);
      setKbSearched(true);
    } catch (e) {
      setError(e.response?.data?.detail || "Knowledge search failed. Index documents first.");
    } finally {
      setKbLoading(false);
    }
  };

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-10">
      <h1 className="text-2xl font-bold text-white">Submit a Ticket</h1>

      {/* ── Form card ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Brief summary of the issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={6}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Describe your issue in detail…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !subject.trim() || !body.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? "Submitting…" : "Submit Ticket"}
          </button>
          <button
            onClick={handleFindKnowledge}
            disabled={kbLoading || (!subject.trim() && !body.trim())}
            className="flex items-center gap-2 border border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400 disabled:opacity-40 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            {kbLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
              </svg>
            )}
            Find Similar Knowledge
          </button>
        </div>
      </div>

      {/* ── Error alert ── */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠</span>{error}
        </div>
      )}

      {/* ── Knowledge Results ── */}
      {kbSearched && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
            </svg>
            Similar Knowledge Articles ({kbResults.length})
          </h2>
          {kbResults.length === 0 ? (
            <p className="text-gray-500 text-sm">No relevant articles found.</p>
          ) : (
            kbResults.map((r, i) => <KnowledgeResultCard key={r.chunk_id} result={r} rank={i + 1} />)
          )}
        </div>
      )}

      {/* ── Submission Result ── */}
      {result && (
        <div className="bg-gray-900 rounded-xl border border-green-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-lg">✓</span>
            <h2 className="font-semibold text-gray-200">Ticket Submitted Successfully</h2>
          </div>
          <p className="text-xs text-gray-400 font-mono">ID: {result.ticket_id}</p>
          <div className="grid grid-cols-3 gap-4">
            <ResultBox label="Category" value={result.category} extra={`${(result.category_confidence*100).toFixed(1)}% confidence`} />
            <ResultBox label="Priority" value={result.priority} cls={PRIORITY_COLOR[result.priority]} extra={`${(result.priority_confidence*100).toFixed(1)}% confidence`} />
            <ResultBox label="Severity" value={result.severity} cls={SEVERITY_COLOR[result.severity]} />
          </div>
          <button onClick={() => navigate("/tickets")} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View all tickets →
          </button>
        </div>
      )}
    </div>
    </div>
  );
}

function ResultBox({ label, value, cls = "text-gray-200", extra }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-base font-bold ${cls}`}>{value}</p>
      {extra && <p className="text-xs text-gray-400 mt-1">{extra}</p>}
    </div>
  );
}
