import { useState, useEffect } from "react";
import { getEmails, getEmailStats, getEmailByTicket } from "../services/api";

const ESC_COLOR = {
  "Escalate":     "bg-red-900/40 text-red-300 border-red-700",
  "Auto-Resolve": "bg-green-900/40 text-green-300 border-green-700",
};
const PRI_COLOR = {
  critical: "bg-red-900/40 text-red-300 border-red-700",
  high:     "bg-red-900/40 text-red-300 border-red-700",
  medium:   "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  low:      "bg-green-900/40 text-green-300 border-green-700",
};

function Badge({ label, colorMap }) {
  const cls = colorMap[label] ?? "bg-gray-800 text-gray-400 border-gray-600";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>;
}

function StatCard({ title, value, color }) {
  const colors = {
    blue:   "bg-blue-900/30 border-blue-700 text-blue-400",
    green:  "bg-green-900/30 border-green-700 text-green-400",
    red:    "bg-red-900/30 border-red-700 text-red-400",
    purple: "bg-purple-900/30 border-purple-700 text-purple-400",
  };
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${colors[color] ?? colors.blue}`}>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="text-3xl font-bold mt-1 text-white">{value ?? "—"}</p>
    </div>
  );
}

function EmailModal({ ticketId, onClose }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmailByTicket(ticketId)
      .then(r => setEmail(r.data))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, [ticketId]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Email Preview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : !email ? (
            <p className="text-gray-400 text-sm">Email not found.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-400">To:</span> <span className="text-white">{email.recipient}</span></p>
                <p><span className="text-gray-400">Subject:</span> <span className="text-white">{email.subject}</span></p>
                <p><span className="text-gray-400">Sent:</span> <span className="text-gray-300">{new Date(email.sent_at).toLocaleString()}</span></p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{email.body}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailPage() {
  const [emails,   setEmails]   = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [skip,     setSkip]     = useState(0);
  const [preview,  setPreview]  = useState(null);
  const LIMIT = 50;

  const fetchAll = async (s = 0) => {
    setLoading(true);
    try {
      const [e, st] = await Promise.all([getEmails(s, LIMIT), getEmailStats()]);
      setEmails(e.data);
      setStats(st.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(skip); }, [skip]);

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 space-y-6 pb-10">

      <div>
        <h1 className="text-2xl font-bold text-white">Email Automation</h1>
        <p className="text-gray-400 text-sm mt-1">Auto-generated email notifications from the Multi-Agent Workflow</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Emails"  value={stats?.total}        color="blue"   />
        <StatCard title="Sent"          value={stats?.sent}         color="green"  />
        <StatCard title="Auto-Resolved" value={stats?.auto_resolved} color="purple" />
        <StatCard title="Escalated"     value={stats?.escalated}    color="red"    />
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300">Email History</h2>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm p-5">Loading…</p>
        ) : emails.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">📧</p>
            <p className="text-white font-semibold">No emails yet</p>
            <p className="text-gray-400 text-sm">Run the Multi-Agent Workflow to generate email notifications.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                <tr>
                  {["Ticket ID", "Subject", "Recipient", "Category", "Priority", "Team", "Escalation", "Status", "Sent At", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {emails.map(e => (
                  <tr key={e.ticket_id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-2 text-gray-400 font-mono text-xs">{e.ticket_id?.slice(0,8)}…</td>
                    <td className="px-4 py-2 text-gray-200 max-w-xs truncate text-xs">{e.subject}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{e.recipient}</td>
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap text-xs">{e.category}</td>
                    <td className="px-4 py-2"><Badge label={e.priority} colorMap={PRI_COLOR} /></td>
                    <td className="px-4 py-2 text-gray-300 whitespace-nowrap text-xs">{e.assigned_team}</td>
                    <td className="px-4 py-2"><Badge label={e.escalation_status} colorMap={ESC_COLOR} /></td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-900/40 text-green-300 border-green-700">
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setPreview(e.ticket_id)}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 px-2 py-1 rounded-lg transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {emails.length > 0 && (
        <div className="flex gap-3">
          <button
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - LIMIT))}
            className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
          >← Prev</button>
          <button
            disabled={emails.length < LIMIT}
            onClick={() => setSkip(skip + LIMIT)}
            className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
          >Next →</button>
        </div>
      )}
    </div>

    {preview && <EmailModal ticketId={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
