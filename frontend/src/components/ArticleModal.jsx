import { useEffect, useRef } from "react";

const CATEGORY_MAP = {
  "billing_and_payments.md":       "Billing & Payments",
  "customer_service.md":           "Customer Service",
  "general_inquiry.md":            "General Inquiry",
  "human_resources.md":            "Human Resources",
  "it_support.md":                 "IT Support",
  "product_support.md":            "Product Support",
  "returns_and_exchanges.md":      "Returns & Exchanges",
  "sales_and_presales.md":         "Sales & Pre-Sales",
  "service_outages_maintenance.md":"Service Outages",
  "technical_support.md":          "Technical Support",
};

function HighlightedText({ text, query }) {
  if (!query) return <span className="whitespace-pre-wrap">{text}</span>;

  const keywords = [...new Set(
    query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  )];
  if (!keywords.length) return <span className="whitespace-pre-wrap">{text}</span>;

  const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts   = text.split(pattern);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        keywords.some(k => k.toLowerCase() === part.toLowerCase())
          ? <mark key={i} className="bg-yellow-400/40 text-yellow-100 rounded px-0.5 font-medium">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

export default function ArticleModal({ result, query, onClose }) {
  const highlightRef = useRef(null);

  const docTitle = result.filename
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  const category = CATEGORY_MAP[result.filename] ?? "Knowledge Base";

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    // Scroll to first highlight after render
    setTimeout(() => {
      const el = highlightRef.current?.querySelector("mark");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-gray-700">
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white">{docTitle}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-blue-300 bg-blue-900/40 border border-blue-800 px-2.5 py-0.5 rounded-full">
                {category}
              </span>
              <span className="text-xs text-gray-500">{result.filename}</span>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-500">Chunk #{result.chunk_id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800 ml-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Info banner ── */}
        {query && (
          <div className="mx-5 mt-4 flex items-center gap-2 bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-300">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            Keywords from your query are highlighted below.
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            ref={highlightRef}
            className="text-sm leading-relaxed bg-gray-950 rounded-xl p-5 border border-gray-800 text-gray-200"
          >
            <HighlightedText text={result.text} query={query} />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
