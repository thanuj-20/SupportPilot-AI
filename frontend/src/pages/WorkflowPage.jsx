import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { runWorkflow } from "../services/api";

const HEALTH_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/api$/, "/health");

const AGENTS = [
  { key: "diagnosis",  label: "Diagnosis Agent",  icon: "🔍", desc: "Predicts Category, Priority & Severity" },
  { key: "retrieval",  label: "Retrieval Agent",  icon: "📚", desc: "Searches FAISS Knowledge Base" },
  { key: "resolution", label: "Resolution Agent", icon: "🛠", desc: "Generates Troubleshooting Response" },
  { key: "escalation", label: "Escalation Agent", icon: "🚦", desc: "Decides Auto-Resolve or Escalate" },
];

// stage index: 0=idle, 1=diagnosis, 2=retrieval, 3=resolution, 4=escalation, 5=done
function agentCardState(agentIndex, activeIndex) {
  if (activeIndex === 0) return "pending";
  if (agentIndex + 1 === activeIndex) return "running";
  if (agentIndex + 1 < activeIndex)  return "done";
  return "pending";
}

const STAGE_LABELS = ["", "Running Diagnosis Agent...", "Running Retrieval Agent...", "Running Resolution Agent...", "Running Escalation Agent...", "Completed"];

const CONF_COLOR = { High: "text-green-400", Medium: "text-yellow-300", Low: "text-red-400" };
const CONF_BAR   = { High: "bg-green-500",   Medium: "bg-yellow-500",   Low: "bg-red-500"   };
const DEC_COLOR  = { "Auto-Resolve": "text-green-400", "Escalate": "text-red-400" };
const DEC_BG     = { "Auto-Resolve": "bg-green-900/40 border-green-700", "Escalate": "bg-red-900/40 border-red-700" };
const PRI_COLOR  = { critical:"text-red-400", high:"text-red-300", medium:"text-yellow-300", low:"text-green-400" };

function AgentCard({ agent, state, label }) {
  const isRunning = state === "running";
  const isDone    = state === "done";
  return (
    <div className={`bg-gray-900 rounded-xl border p-4 transition-all duration-500 ${
      isRunning ? "border-blue-500 shadow-lg shadow-blue-900/30" :
      isDone    ? "border-green-700" :
                  "border-gray-700 opacity-50"
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{agent.label}</p>
          <p className="text-xs text-gray-400">{isRunning ? label : agent.desc}</p>
        </div>
        <div className="shrink-0">
          {isRunning && <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse block" />}
          {isDone    && <span className="text-green-400 text-lg">✓</span>}
          {!isRunning && !isDone && <span className="w-3 h-3 rounded-full bg-gray-600 block" />}
        </div>
      </div>
      {isRunning && (
        <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
          <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      )}
    </div>
  );
}

function LogEntry({ entry }) {
  const color = {
    DiagnosisAgent: "text-blue-400", RetrievalAgent: "text-purple-400",
    ResolutionAgent: "text-yellow-300", EscalationAgent: "text-orange-400",
    Orchestrator: "text-red-400",
  }[entry.agent] ?? "text-gray-400";
  return (
    <div className="flex gap-3 text-xs font-mono">
      <span className="text-gray-500 shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
      <span className={`shrink-0 font-semibold ${color}`}>[{entry.agent}]</span>
      <span className="text-gray-300">{entry.message}</span>
    </div>
  );
}

export default function WorkflowPage() {
  const [subject,     setSubject]     = useState("");
  const [body,        setBody]        = useState("");
  const [userEmail,   setUserEmail]   = useState("");
  const [running,     setRunning]     = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");
  const [warmingUp,   setWarmingUp]   = useState(false);
  const tickerRef = useRef(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const pre = searchParams.get("prefill");
    if (pre) setBody(decodeURIComponent(pre));
  }, []);

  const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const stopTicker = () => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
  };

  useEffect(() => () => stopTicker(), []);

  const handleRun = async () => {
    if (running) return; // prevent duplicate execution
    if (!subject.trim() || !body.trim()) return;
    if (userEmail.trim() && !isValidEmail(userEmail.trim())) {
      setError("Please enter a valid email address (e.g. you@example.com)");
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);
    setActiveIndex(1);
    stopTicker();

    // Wake backend if sleeping
    try { await axios.get(HEALTH_URL, { timeout: 30000 }); } catch (_) {}

    tickerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev < 4 ? prev + 1 : prev));
    }, 2000);

    // Auto-retry on 503 (ST still warming up) up to 6x with 20s delay
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const { data } = await runWorkflow(subject, body, null, userEmail || null);
        stopTicker();
        setActiveIndex(5);
        setResult(data);
        setWarmingUp(false);
        setRunning(false);
        return;
      } catch (e) {
        if (e.response?.status === 503) {
          setWarmingUp(true);
          await new Promise(r => setTimeout(r, 20000));
          continue;
        }
        stopTicker();
        setActiveIndex(0);
        setWarmingUp(false);
        setRunning(false);
        if (e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
          setError("Server is warming up. Please wait 20 seconds and try again.");
        } else if (!e.response) {
          setError("Cannot reach backend. Please try again in a few seconds.");
        } else {
          setError(e.response?.data?.detail || `Backend error (${e.response.status}). Please try again.`);
        }
        return;
      }
    }
    stopTicker();
    setActiveIndex(0);
    setWarmingUp(false);
    setRunning(false);
    setError("Server took too long to warm up. Please try again.");
  };

  const diag = result?.diagnosis;
  const res  = result?.resolution;
  const esc  = result?.escalation;
  const conf = res?.confidence_score ?? 0;

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-10">

      <div>
        <h1 className="text-2xl font-bold text-white">Multi-Agent Workflow</h1>
        <p className="text-gray-400 text-sm mt-1">
          Diagnosis → Retrieval → Resolution → Escalation · Powered by 4 coordinated AI agents
        </p>
      </div>

      {/* Agent pipeline cards — driven by real backend stage */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {AGENTS.map((a, i) => (
          <AgentCard
            key={a.key}
            agent={a}
            state={agentCardState(i, activeIndex)}
            label={STAGE_LABELS[activeIndex]}
          />
        ))}
      </div>

      {/* Stage status bar */}
      {running && (
        <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${
          warmingUp ? "bg-yellow-900/20 border-yellow-700" : "bg-gray-900 border-blue-800"
        }`}>
          <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"
            style={{ color: warmingUp ? "#facc15" : "#60a5fa" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span className={`text-sm font-medium ${
            warmingUp ? "text-yellow-300" : "text-blue-300"
          }`}>
            {warmingUp ? "⏳ Server warming up, retrying automatically…" : STAGE_LABELS[activeIndex]}
          </span>
        </div>
      )}

      {/* Input form */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Submit Ticket to Workflow</p>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Subject <span className="text-red-400">*</span></label>
          <input
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Brief summary of the issue"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description <span className="text-red-400">*</span></label>
          <textarea
            rows={4}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Describe the issue in detail…"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Your Email <span className="text-gray-500 font-normal">(optional — receive status notification)</span>
          </label>
          <input
            type="email"
            className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              userEmail.trim() && !isValidEmail(userEmail.trim()) ? "border-red-500" : "border-gray-600"
            }`}
            placeholder="you@example.com"
            value={userEmail}
            onChange={e => setUserEmail(e.target.value)}
          />
          {userEmail.trim() && !isValidEmail(userEmail.trim()) && (
            <p className="text-xs text-red-400 mt-1">⚠ Invalid email format</p>
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={running || !subject.trim() || !body.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {running ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {STAGE_LABELS[activeIndex] || "Running Agents…"}
            </>
          ) : "▶ Run Multi-Agent Workflow"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠</span>{error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl border border-green-700 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-sm font-semibold text-gray-200">Workflow Completed</span>
              <span className="text-xs text-gray-500 font-mono ml-2">{result.workflow_id?.slice(0,8)}</span>
              {result.total_duration_ms && (
                <span className="text-xs text-gray-500 ml-1">({(result.total_duration_ms/1000).toFixed(1)}s)</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Jira: <span className="text-blue-400 font-semibold">{result.jira?.jira_id}</span></span>
              <span>Email: <span className="text-green-400 font-semibold">{result.email?.status}</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diagnosis */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
              <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wide">🔍 Diagnosis</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Category", value: diag?.category },
                  { label: "Priority", value: diag?.priority, cls: PRI_COLOR[diag?.priority] },
                  { label: "Severity", value: diag?.severity },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className={`text-sm font-bold ${cls ?? "text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ConfMini label="Category Conf" value={diag?.category_confidence} />
                <ConfMini label="Priority Conf"  value={diag?.priority_confidence} />
              </div>
            </div>

            {/* Resolution */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
              <h2 className="text-xs font-semibold text-yellow-300 uppercase tracking-wide">🛠 Resolution</h2>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Issue</p>
                <p className="text-sm text-white font-medium">{res?.issue}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Possible Cause</p>
                <p className="text-sm text-gray-300">{res?.possible_cause}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${CONF_BAR[res?.confidence_label]}`}
                         style={{ width: `${conf * 100}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${CONF_COLOR[res?.confidence_label]}`}>
                    {res?.confidence_label} ({Math.round(conf * 100)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Solution Steps */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
              <h2 className="text-xs font-semibold text-purple-400 uppercase tracking-wide">📋 Solution Steps</h2>
              {res?.solution_steps?.length ? (
                <ol className="space-y-2">
                  {res.solution_steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-purple-900/50 text-purple-300 text-xs flex items-center justify-center font-bold">{i+1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              ) : <p className="text-gray-500 text-sm">No steps available.</p>}
            </div>

            {/* Escalation */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
              <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wide">🚦 Escalation</h2>
              <div className={`rounded-lg border px-4 py-3 ${DEC_BG[esc?.decision]}`}>
                <p className="text-xs text-gray-400 mb-1">Decision</p>
                <p className={`text-lg font-bold ${DEC_COLOR[esc?.decision]}`}>{esc?.decision}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Assigned Team</p>
                  <p className="text-sm text-white font-medium">{esc?.assigned_team}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <p className="text-sm text-white font-medium">{esc?.resolution_status}</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Reason</p>
                <p className="text-xs text-gray-300">{esc?.reason}</p>
              </div>
            </div>
          </div>

          {res?.prevention_tips?.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
              <h2 className="text-xs font-semibold text-teal-400 uppercase tracking-wide mb-3">🛡 Prevention Tips</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {res.prevention_tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-teal-400 shrink-0">•</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📜 Execution Log</h2>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {result.logs?.map((entry, i) => <LogEntry key={i} entry={entry} />)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl border border-blue-800 p-5 space-y-2">
              <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wide">🎫 Jira Ticket Created</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Jira ID",    value: result.jira?.jira_id },
                  { label: "Status",     value: result.jira?.status },
                  { label: "Team",       value: result.jira?.assigned_team },
                  { label: "Escalation", value: result.jira?.escalation_status },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm text-white font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-green-800 p-5 space-y-2">
              <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wide">📧 Email Notification</h2>
              {result.email?.user_email ? (
                <div className={`rounded-lg border px-4 py-3 mb-2 ${
                  result.escalation?.decision === "Auto-Resolve"
                    ? "bg-green-900/40 border-green-700"
                    : "bg-yellow-900/40 border-yellow-800"
                }`}>
                  <p className="text-xs font-semibold mb-0.5">
                    {result.escalation?.decision === "Auto-Resolve"
                      ? "✅ Resolution email sent to your inbox"
                      : "🔄 Processing update sent to your inbox"}
                  </p>
                  <p className="text-xs text-gray-300">{result.email.recipient}</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Status",    value: result.email?.status },
                  { label: "Recipient", value: result.email?.recipient },
                  { label: "Category",  value: result.email?.category },
                  { label: "Sent At",   value: result.email?.sent_at ? new Date(result.email.sent_at).toLocaleTimeString() : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm text-white font-medium truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function ConfMini({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{Math.round((value ?? 0) * 100)}%</p>
    </div>
  );
}
