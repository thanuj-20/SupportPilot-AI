import { useState, useEffect } from "react";
import { getIntegrationsStatus, getJiraTickets, getEmails } from "../services/api";

function HealthBadge({ health }) {
  return health === "healthy"
    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-900/40 text-green-300 border-green-700">● Healthy</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-900/40 text-red-300 border-red-700">● Degraded</span>;
}

function IntegrationCard({ icon, title, health, stats, rows }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-gray-400">Simulated · MongoDB backed</p>
          </div>
        </div>
        <HealthBadge health={health} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(({ label, value, cls }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${cls ?? "text-white"}`}>{value ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [status,       setStatus]       = useState(null);
  const [recentJira,   setRecentJira]   = useState([]);
  const [recentEmails, setRecentEmails] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  useEffect(() => {
    Promise.all([
      getIntegrationsStatus(),
      getJiraTickets(0, 5),
      getEmails(0, 5),
    ])
      .then(([s, j, e]) => {
        setStatus(s.data);
        setRecentJira(j.data);
        setRecentEmails(e.data);
      })
      .catch(() => setError("Cannot reach backend."))
      .finally(() => setLoading(false));
  }, []);

  const wf    = status?.workflow;
  const jira  = status?.jira;
  const email = status?.email;

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 space-y-6 pb-10">

      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-gray-400 text-sm mt-1">
          Multi-Agent Workflow · Simulated Jira · Simulated Email Automation
        </p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span>⚠</span>{error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* Integration health cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <IntegrationCard
              icon="🤖" title="Multi-Agent Workflow" health={wf?.health}
              rows={[
                { label: "Total Runs",  value: wf?.total,     cls: "text-white" },
                { label: "Completed",   value: wf?.completed, cls: "text-green-400" },
                { label: "Failed",      value: wf?.failed,    cls: wf?.failed > 0 ? "text-red-400" : "text-white" },
                { label: "Success Rate", value: wf?.total > 0 ? `${Math.round(wf.completed/wf.total*100)}%` : "N/A", cls: "text-blue-400" },
              ]}
            />
            <IntegrationCard
              icon="🎫" title="Jira Integration" health={jira?.health}
              rows={[
                { label: "Total Tickets",  value: jira?.total,        cls: "text-white" },
                { label: "Open",           value: jira?.open,         cls: "text-blue-400" },
                { label: "Auto-Resolved",  value: jira?.auto_resolved, cls: "text-green-400" },
                { label: "Escalated",      value: jira?.escalated,    cls: jira?.escalated > 0 ? "text-red-400" : "text-white" },
              ]}
            />
            <IntegrationCard
              icon="📧" title="Email Automation" health={email?.health}
              rows={[
                { label: "Total Emails",   value: email?.total,        cls: "text-white" },
                { label: "Sent",           value: email?.sent,         cls: "text-green-400" },
                { label: "Auto-Resolved",  value: email?.auto_resolved, cls: "text-green-400" },
                { label: "Escalated",      value: email?.escalated,    cls: email?.escalated > 0 ? "text-red-400" : "text-white" },
              ]}
            />
          </div>

          {/* Recent Jira tickets */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">🎫 Recent Jira Tickets</h2>
            {recentJira.length === 0 ? (
              <p className="text-gray-500 text-sm">No Jira tickets yet. Run the workflow to generate records.</p>
            ) : (
              <div className="space-y-2">
                {recentJira.map(t => (
                  <div key={t.jira_id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-blue-400 font-mono text-xs font-semibold shrink-0">{t.jira_id}</span>
                      <span className="text-gray-200 text-sm truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-gray-400">{t.assigned_team}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        t.escalation_status === "Escalate"
                          ? "bg-red-900/40 text-red-300 border-red-700"
                          : "bg-green-900/40 text-green-300 border-green-700"
                      }`}>{t.escalation_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent emails */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">📧 Recent Emails</h2>
            {recentEmails.length === 0 ? (
              <p className="text-gray-500 text-sm">No emails yet. Run the workflow to generate notifications.</p>
            ) : (
              <div className="space-y-2">
                {recentEmails.map(e => (
                  <div key={e.ticket_id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-gray-400 font-mono text-xs shrink-0">{e.ticket_id?.slice(0,8)}…</span>
                      <span className="text-gray-200 text-xs truncate">{e.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-gray-400">{e.sent_at ? new Date(e.sent_at).toLocaleDateString() : "—"}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-900/40 text-green-300 border-green-700">
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </div>
  );
}
