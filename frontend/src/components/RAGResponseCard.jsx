/**
 * RAGResponseCard — displays the AI-generated troubleshooting response
 * produced by the RAG pipeline (FAISS retrieval + rule-based generation).
 */

const CONFIDENCE_STYLE = {
  High:   "bg-green-900/40 text-green-300 border-green-700",
  Medium: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  Low:    "bg-red-900/40 text-red-300 border-red-700",
};

export default function RAGResponseCard({ response, query, onViewSource }) {
  if (!response) return null;

  if (response.no_context) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-center space-y-2">
        <p className="text-gray-400 text-sm">🔍 No suitable troubleshooting information was found in the knowledge base.</p>
        <p className="text-xs text-gray-600">Try rephrasing your query or uploading a relevant document.</p>
      </div>
    );
  }

  const confStyle = CONFIDENCE_STYLE[response.confidence] ?? CONFIDENCE_STYLE.Low;

  return (
    <div className="bg-gray-900 border border-blue-800 rounded-xl overflow-hidden shadow-lg shadow-blue-900/20">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-blue-900/20 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-lg">🤖</span>
          <span className="text-sm font-semibold text-white">AI Troubleshooting Response</span>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${confStyle}`}>
          {response.confidence} Confidence
        </span>
      </div>

      <div className="p-5 space-y-5">

        {/* Issue */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Issue</p>
          <p className="text-white font-semibold text-base">{response.issue}</p>
        </section>

        {/* Possible Cause */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Possible Cause</p>
          <p className="text-gray-300 text-sm">{response.cause}</p>
        </section>

        {/* Recommended Solution */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Solution</p>
          <ol className="space-y-1.5">
            {response.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* Prevention Tips */}
        {response.prevention?.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prevention Tips</p>
            <ul className="space-y-1">
              {response.prevention.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-green-400 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Source Documents */}
        {response.sources?.length > 0 && (
          <section className="pt-1 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Source Documents</p>
            <div className="flex flex-wrap gap-2">
              {response.sources.map((src) => (
                <button
                  key={src}
                  onClick={() => {
                    const chunk = response.raw_chunks?.find(c => c.filename === src);
                    if (chunk) onViewSource(chunk);
                  }}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-800 hover:border-blue-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  {src}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
