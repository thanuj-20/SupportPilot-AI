import { useState, useEffect } from "react";
import { getWorkflowStats, getWorkflowHistory } from "../services/api";

const STATUS_COLOR = {
  completed: "bg-green-900/40 text-green-400 border-green-700",
  failed:    "bg-red-900/40   text-red-400   border-red-700",
};
const DEC_COLOR = {
  "Auto-Resolve": "text-green-400",
  "Escalate":     "text-red-400",
};

export default function WorkflowMonitorPage() {
  const [stats,   setStats]   = useState(null);
  const [runs,    setRuns]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState("all"); // all | completed | failed

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([getWorkflowStats(), getWorkflowHistory(0, 50)]);
        setStats(s.data);
        setRuns(r.data);
        setError("");
      } catch {
        setError("Failed to load workflow data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = filter === "all" ? runs : runs.filter(r => r.status === filter);
  const failed   = runs.filter(r => r.status === "failed");

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto pb-10">

      <div>
        <h1 className="text-2xl font-bold text-white">Workflow Monitor</h1>
        <p className="text-gray-400 text-sm mt-1">
          Diagnosis → Retrieval → Resolution → Escalation · Pipeline execution tracking
        </p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Runs",       value: stats?.total,            color: "border-blue-700   text-blue-400   bg-blue-900/30"   },
          { label: "Completed",        value: stats?.completed,        color: "border-green-700  text-green-400  bg-green-900/30"  },
          { label: "Failed",           value: stats?.failed,           color: "border-red-700    text-red-400    bg-red-900/30"    },
          { label: "Success Rate",     value: stats ? `${stats.success_rate}%` : "—", color: "border-purple-700 text-purple-400 bg-purple-900/30" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-5 shadow-sm ${color}`}>
            <p className="text-sm font-medium text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Auto-Resolved",    value: stats?.auto_resolved,    color: "border-green-700  text-green-400  bg-green-900/30"  },
          { label: "Escalated",        value: stats?.escalated,        color: "border-red-700    text-red-400    bg-red-900/30"    },
          { label: "Avg Duration",     value: stats?.avg_duration_ms ? `${(stats.avg_duration_ms/1000).toFixed(1)}s` : "—", color: "border-yellow-700 text-yellow-300 bg-yellow-900/30" },
          { label: "Max Duration",     value: stats?.max_duration_ms ? `${(stats.max_duration_ms/1000).toFixed(1)}s` : "—", color: "border-orange-700 text-orange-400 bg-orange-900/30" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-5 shadow-sm ${color}`}>
            <p className="text-sm font-medium text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* Failed workflows alert */}
      {failed.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-300 mb-2">⚠ {failed.length} Failed Workflow{failed.length > 1 ? "s" : ""}</p>
          <div className="space-y-1">
            {failed.slice(0, 5).map(r => (
              <div key={r.workflow_id} className="flex gap-3 text-xs text-red-300 font-mono">
                <span className="text-gray-500">{r.workflow_id?.slice(0,8)}</span>
                <span>{r.error || "Unknown error"}</span>
                <span className="text-gray-500 ml-auto">{r.started_at ? new Date(r.started_at).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "completed", "failed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm px-4 py-1.5 rounded-lg border transition-colors capitalize ${
              filter === f
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}>
            {f} {f === "all" ? `(${runs.length})` : f === "completed" ? `(${stats?.completed ?? 0})` : `(${stats?.failed ?? 0})`}
          </button>
        ))}
      </div>

      {/* Runs table */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm animate-pulse">Loading workflow runs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">No workflow runs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wide">
                  {["Workflow ID","Ticket ID","Status","Decision","Category","Priority","Confidence","Duration","Started At"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(r => {
                  const durationMs = r.started_at && r.completed_at
                    ? new Date(r.completed_at) - new Date(r.started_at)
                    : null;
                  return (
                    <tr key={r.workflow_id} className="hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.workflow_id?.slice(0,8)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.ticket_id?.slice(0,8)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLOR[r.status] ?? "text-gray-400"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${DEC_COLOR[r.escalation?.decision] ?? "text-gray-400"}`}>
                        {r.escalation?.decision ?? (r.status === "failed" ? "—" : "—")}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.diagnosis?.category ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-300 capitalize">{r.diagnosis?.priority ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-300">{r.resolution?.confidence_label ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {durationMs != null ? `${(durationMs/1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {r.started_at ? new Date(r.started_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
    </div>
  );
}
