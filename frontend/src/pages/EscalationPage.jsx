import { useState, useEffect, useCallback } from "react";
import { getEscalations, getEscalationStats, updateEscalationStatus } from "../services/api";

const STATUS_FLOW  = ["Escalated", "In Progress", "Resolved"];
const STATUS_COLOR = {
  "Escalated":   "bg-red-900/40 text-red-300 border-red-700",
  "In Progress": "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  "Resolved":    "bg-green-900/40 text-green-400 border-green-700",
};
const PRI_COLOR = {
  critical: "text-red-400", high: "text-red-300",
  medium: "text-yellow-300", low: "text-green-400",
};

export default function EscalationPage() {
  const [records,  setRecords]  = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error,    setError]    = useState("");
  const [filters,  setFilters]  = useState({ status: "", priority: "", severity: "", category: "", assigned_team: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const [r, s] = await Promise.all([getEscalations(params), getEscalationStats()]);
      setRecords(r.data);
      setStats(s.data);
      setError("");
    } catch {
      setError("Failed to load escalation data.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (ticket_id, newStatus) => {
    setUpdating(ticket_id);
    try {
      await updateEscalationStatus(ticket_id, newStatus);
      await fetchData();
    } catch {
      setError("Failed to update status.");
    } finally {
      setUpdating(null);
    }
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ status: "", priority: "", severity: "", category: "", assigned_team: "" });

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Escalation Monitoring</h1>
        <p className="text-gray-400 text-sm mt-1">Track and manage escalated tickets · Update status as work progresses</p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Escalated",  value: stats?.total,       color: "border-blue-700   text-blue-400   bg-blue-900/30"   },
          { label: "Open Escalations", value: stats?.escalated,   color: "border-red-700    text-red-400    bg-red-900/30"    },
          { label: "In Progress",      value: stats?.in_progress, color: "border-yellow-700 text-yellow-300 bg-yellow-900/30" },
          { label: "Resolved",         value: stats?.resolved,    color: "border-green-700  text-green-400  bg-green-900/30"  },
          { label: "Critical/High",    value: stats?.critical,    color: "border-orange-700 text-orange-400 bg-orange-900/30" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-5 shadow-sm ${color}`}>
            <p className="text-sm font-medium text-gray-400">{label}</p>
            <p className="text-3xl font-bold mt-1 text-white">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect label="Status"   value={filters.status}   onChange={v => setFilter("status", v)}
            options={["", "Escalated", "In Progress", "Resolved"]} />
          <FilterSelect label="Priority" value={filters.priority} onChange={v => setFilter("priority", v)}
            options={["", "critical", "high", "medium", "low"]} />
          <FilterSelect label="Severity" value={filters.severity} onChange={v => setFilter("severity", v)}
            options={["", "Critical", "High", "Medium", "Low"]} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Category</label>
            <input
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search category…"
              value={filters.category}
              onChange={e => setFilter("category", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Assigned Team</label>
            <input
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search team…"
              value={filters.assigned_team}
              onChange={e => setFilter("assigned_team", e.target.value)}
            />
          </div>
          <button onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm animate-pulse">Loading escalations…</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">No escalation records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wide">
                  {["Ticket ID","Subject","Category","Priority","Severity","Confidence","Assigned Team","Reason","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {records.map(r => (
                  <tr key={r.ticket_id} className={`hover:bg-gray-800 transition-colors ${
                    r.priority === "critical" || r.priority === "high" ? "border-l-2 border-red-600" : ""
                  }`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.ticket_id?.slice(0,8)}</td>
                    <td className="px-4 py-3 text-white max-w-[180px] truncate" title={r.subject}>{r.subject}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.category}</td>
                    <td className={`px-4 py-3 font-semibold capitalize ${PRI_COLOR[r.priority] ?? "text-white"}`}>{r.priority}</td>
                    <td className="px-4 py-3 text-gray-300">{r.severity}</td>
                    <td className="px-4 py-3 text-gray-300">{r.confidence}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.assigned_team}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate" title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLOR[r.status] ?? "text-gray-400"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusActions
                        current={r.status}
                        ticketId={r.ticket_id}
                        updating={updating === r.ticket_id}
                        onChange={handleStatusChange}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map(o => <option key={o} value={o}>{o || `All ${label}s`}</option>)}
      </select>
    </div>
  );
}

function StatusActions({ current, ticketId, updating, onChange }) {
  const idx  = STATUS_FLOW.indexOf(current);
  const next = STATUS_FLOW[idx + 1];
  const prev = STATUS_FLOW[idx - 1];

  if (updating) return <span className="text-xs text-gray-500 animate-pulse">Updating…</span>;

  return (
    <div className="flex gap-1">
      {next && (
        <button onClick={() => onChange(ticketId, next)}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors whitespace-nowrap">
          → {next}
        </button>
      )}
      {prev && (
        <button onClick={() => onChange(ticketId, prev)}
          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors whitespace-nowrap">
          ← {prev}
        </button>
      )}
      {!next && !prev && <span className="text-xs text-gray-500">—</span>}
    </div>
  );
}
