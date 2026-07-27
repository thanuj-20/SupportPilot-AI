/**
 * KnowledgeResultCard — displays a single FAISS search result with
 * document name, category, similarity score, matched keywords, preview.
 */

// Map filename → human-readable category
const CATEGORY_MAP = {
  "billing_and_payments.md":      { label: "Billing & Payments",       color: "bg-emerald-900/40 text-emerald-300 border-emerald-700" },
  "customer_service.md":          { label: "Customer Service",          color: "bg-sky-900/40 text-sky-300 border-sky-700" },
  "general_inquiry.md":           { label: "General Inquiry",           color: "bg-gray-800 text-gray-300 border-gray-600" },
  "human_resources.md":           { label: "Human Resources",           color: "bg-purple-900/40 text-purple-300 border-purple-700" },
  "it_support.md":                { label: "IT Support",                color: "bg-blue-900/40 text-blue-300 border-blue-700" },
  "product_support.md":           { label: "Product Support",           color: "bg-orange-900/40 text-orange-300 border-orange-700" },
  "returns_and_exchanges.md":     { label: "Returns & Exchanges",       color: "bg-rose-900/40 text-rose-300 border-rose-700" },
  "sales_and_presales.md":        { label: "Sales & Pre-Sales",         color: "bg-yellow-900/40 text-yellow-300 border-yellow-700" },
  "service_outages_maintenance.md":{ label: "Service Outages",          color: "bg-red-900/40 text-red-300 border-red-700" },
  "technical_support.md":         { label: "Technical Support",         color: "bg-indigo-900/40 text-indigo-300 border-indigo-700" },
};

const DEFAULT_CATEGORY = { label: "Knowledge Base", color: "bg-gray-800 text-gray-300 border-gray-600" };

// Cosine score (0–1) → display percentage
const toPct = (score) => Math.min(100, Math.max(0, Math.round(((score - 0.2) / 0.7) * 100)));

const scoreStyle = (score) => {
  if (score >= 0.75) return { label: "Excellent Match", bar: "bg-green-500",  badge: "bg-green-900/50 text-green-300 border-green-700" };
  if (score >= 0.60) return { label: "Good Match",      bar: "bg-blue-500",   badge: "bg-blue-900/50 text-blue-300 border-blue-700" };
  if (score >= 0.45) return { label: "Relevant",        bar: "bg-yellow-500", badge: "bg-yellow-900/50 text-yellow-300 border-yellow-700" };
  return                    { label: "Low Match",        bar: "bg-gray-500",   badge: "bg-gray-800 text-gray-400 border-gray-600" };
};

function extractKeywords(query, text) {
  if (!query) return [];
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return [...new Set(words.filter(w => text.toLowerCase().includes(w)))];
}

function highlightText(text, keywords) {
  if (!keywords.length) return <span>{text}</span>;
  const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts   = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        keywords.some(k => k.toLowerCase() === part.toLowerCase())
          ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function KnowledgeResultCard({ result, rank, query, onViewFull }) {
  const pct      = toPct(result.score);
  const style    = scoreStyle(result.score);
  const category = CATEGORY_MAP[result.filename] ?? DEFAULT_CATEGORY;
  const keywords = extractKeywords(query, result.text);
  const preview  = result.text.slice(0, 220);
  const docTitle = result.filename.replace(/\.[^.]+$/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="bg-gray-900 border border-gray-700 hover:border-blue-600 rounded-2xl p-5 space-y-3 transition-all duration-200 hover:shadow-xl hover:shadow-blue-900/20">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Rank bubble */}
          <span className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
            {rank}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{docTitle}</p>
            {/* Category badge */}
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${category.color}`}>
              {category.label}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="shrink-0 text-right space-y-1">
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${style.badge}`}>
            {style.label}
          </span>
          <p className="text-xl font-bold text-white">{pct}%</p>
        </div>
      </div>

      {/* ── Similarity bar ── */}
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${style.bar}`} style={{ width: `${pct}%` }} />
      </div>

      {/* ── Preview with keyword highlights ── */}
      <p className="text-sm text-gray-300 leading-relaxed">
        {highlightText(preview, keywords)}
        {result.text.length > 220 && <span className="text-gray-500">…</span>}
      </p>

      {/* ── Matched keywords ── */}
      {keywords.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Matched:</span>
          {keywords.map(kw => (
            <span key={kw} className="text-xs bg-yellow-900/30 text-yellow-300 border border-yellow-800 px-2 py-0.5 rounded-full">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <span className="text-xs text-gray-600">{result.filename}</span>
        <button
          onClick={() => onViewFull(result)}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white bg-blue-900/20 hover:bg-blue-600 border border-blue-800 hover:border-blue-600 px-3 py-1.5 rounded-lg transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          View Full Article
        </button>
      </div>
    </div>
  );
}
