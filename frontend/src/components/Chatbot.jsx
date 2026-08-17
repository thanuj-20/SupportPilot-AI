import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ragKnowledge } from "../services/api";

const QUICK_SUGGESTIONS = [
  "How do I fix a VPN problem?",
  "How do I reset my password?",
  "How do I resolve a billing issue?",
  "How do I report a service outage?",
];

const CONF_MAP = { High: 0.91, Medium: 0.65, Low: 0.32 };

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs shrink-0">🤖</div>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 150, 300].map(d => (
          <span key={d} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

function BotMessage({ msg, onCreateTicket, onSearchKB, onCopy }) {
  const r = msg.response;
  const confVal = r && !r.no_context ? CONF_MAP[r.confidence] : null;

  return (
    <div className="flex items-end gap-2 mb-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs shrink-0">🤖</div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-200 space-y-2">

          {/* Error state */}
          {msg.error && (
            <p className="text-red-400">⚠ {msg.error}</p>
          )}

          {/* No context */}
          {!msg.error && r?.no_context && (
            <p className="text-yellow-300">⚠ I couldn't find relevant information in the knowledge base for that query. Try rephrasing or use the Knowledge Base page for a broader search.</p>
          )}

          {/* Normal answer */}
          {!msg.error && r && !r.no_context && (
            <>
              <p className="text-gray-300">Based on the available support documentation:</p>

              {r.steps?.length > 0 && (
                <ol className="space-y-1 mt-1">
                  {r.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-gray-300">{s}</span>
                    </li>
                  ))}
                </ol>
              )}

              {/* Confidence bar */}
              {confVal !== null && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">AI Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.round(confVal * 100)}%` }} />
                    </div>
                    <span className="text-xs text-blue-400 font-semibold">{Math.round(confVal * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Sources */}
              {r.sources?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">📚 Sources</p>
                  <div className="space-y-1">
                    {r.sources.map((s, i) => {
                      const chunk = r.raw_chunks?.[i];
                      const pct = chunk ? Math.round(chunk.score * 100) : null;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-blue-400 truncate">• {s.replace(/\.md$/i, "").replace(/_/g, " ")}</span>
                          {pct !== null && <span className="text-gray-500 shrink-0 ml-2">Relevance: {pct}%</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        {!msg.error && (
          <div className="flex gap-2 mt-1.5 flex-wrap">
            <button onClick={() => onCreateTicket(msg.query)}
              className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 rounded-lg transition-colors">
              🎫 Create Ticket
            </button>
            <button onClick={() => onSearchKB(msg.query)}
              className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 rounded-lg transition-colors">
              🔍 Search KB
            </button>
            {!msg.error && r && !r.no_context && (
              <button onClick={() => onCopy(r)}
                className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 rounded-lg transition-colors">
                📋 Copy Answer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { type: "user", text: q }]);
    setLoading(true);
    try {
      const { data } = await ragKnowledge(q, 5);
      setMessages(m => [...m, { type: "bot", query: q, response: data.response }]);
    } catch (e) {
      const detail = e.response?.data?.detail;
      const err = detail === "Knowledge base index is not ready."
        ? "Knowledge base is still warming up. Please try again in a moment."
        : "SupportPilot AI is temporarily unavailable. Please try again.";
      setMessages(m => [...m, { type: "bot", query: q, error: err }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = (query) => {
    navigate(`/workflow?prefill=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  const handleSearchKB = (query) => {
    navigate(`/knowledge?q=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  const handleCopy = (r) => {
    const text = [
      r.issue,
      "",
      ...(r.steps?.map((s, i) => `${i + 1}. ${s}`) ?? []),
      "",
      r.sources?.length ? "Sources: " + r.sources.join(", ") : "",
    ].join("\n").trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ${
          open
            ? "bg-gray-700 hover:bg-gray-600 rotate-0"
            : "bg-blue-600 hover:bg-blue-500"
        }`}
        title="SupportPilot AI"
      >
        {open
          ? <span className="text-white text-lg font-bold leading-none">×</span>
          : <>
              <span className="text-lg leading-none">🤖</span>
              <span className="text-white text-[9px] font-bold tracking-wide">AI</span>
            </>
        }
      </button>

      {/* Chat panel */}
      <div className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl border border-gray-700 shadow-2xl bg-gray-950 transition-all duration-300 origin-bottom-right ${
        open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"
      }`} style={{ height: "520px" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm">🤖</div>
            <div>
              <p className="text-sm font-semibold text-white">SupportPilot AI</p>
              <p className="text-xs text-gray-400">AI-powered support assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => setMessages([])}
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors">
                Clear
              </button>
            )}
            <button onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors text-lg leading-none">
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">

          {/* Welcome message */}
          <div className="flex items-end gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs shrink-0">🤖</div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-200">
              Hi! I'm SupportPilot AI. How can I help you today?
            </div>
          </div>

          {/* Quick suggestions — only when empty */}
          {isEmpty && !loading && (
            <div className="pl-9 space-y-1.5 mb-2">
              {QUICK_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="block w-full text-left text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/50 px-3 py-2 rounded-xl transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Conversation */}
          {messages.map((msg, i) => (
            msg.type === "user"
              ? (
                <div key={i} className="flex items-end justify-end gap-2 mb-3 animate-fade-in">
                  <div className="bg-blue-600 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white max-w-[80%]">
                    {msg.text}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs shrink-0">👤</div>
                </div>
              )
              : (
                <BotMessage key={i} msg={msg}
                  onCreateTicket={handleCreateTicket}
                  onSearchKB={handleSearchKB}
                  onCopy={handleCopy}
                />
              )
          ))}

          {loading && <TypingIndicator />}
          {copied && (
            <div className="text-center text-xs text-green-400 py-1">✓ Copied to clipboard</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-800 shrink-0">
          <div className="flex gap-2 items-center bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask SupportPilot AI..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
