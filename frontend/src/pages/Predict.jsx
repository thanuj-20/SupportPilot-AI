import { useState } from "react";
import { predictTicket } from "../services/api";

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

export default function Predict() {
  const [subject, setSubject] = useState("");
  const [body,    setBody]    = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handlePredict = async () => {
    if (!body.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await predictTicket(subject, body);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Prediction failed. Train models first.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-10">
      <h1 className="text-2xl font-bold text-white">Predict Ticket</h1>

      {/* ── Form card ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Subject (optional)</label>
          <input
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="e.g. Cannot access account"
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
            placeholder="Paste or type the ticket body here…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <button
          onClick={handlePredict}
          disabled={loading || !body.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? "Predicting…" : "Predict"}
        </button>
      </div>

      {/* ── Error alert ── */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠</span>{error}
        </div>
      )}

      {/* ── Results card ── */}
      {result && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Prediction Results</h2>
          <div className="grid grid-cols-3 gap-4">
            <ResultBox label="Category" value={result.category} sub={`${(result.category_confidence*100).toFixed(1)}% confidence`} cls="text-blue-400" />
            <ResultBox label="Priority" value={result.priority} sub={`${(result.priority_confidence*100).toFixed(1)}% confidence`} cls={PRIORITY_COLOR[result.priority]} />
            <ResultBox label="Severity" value={result.severity} sub="Generated from priority" cls={SEVERITY_COLOR[result.severity]} />
          </div>

          {/* Confidence bars */}
          <div className="space-y-3">
            <ConfBar label="Category Confidence" value={result.category_confidence} color="bg-blue-500" />
            <ConfBar label="Priority Confidence"  value={result.priority_confidence} color="bg-purple-500" />
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function ResultBox({ label, value, sub, cls = "text-gray-200" }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ConfBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
