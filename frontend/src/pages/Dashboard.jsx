import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import StatCard from "../components/StatCard";
import TicketsTable from "../components/TicketsTable";
import { getDashboard, getTickets, trainModels, getWorkflowStats, getEscalationStats } from "../services/api";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6"];
const pct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : "—");

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [wfStats,  setWfStats]  = useState(null);
  const [escStats, setEscStats] = useState(null);
  const [tickets,  setTickets]  = useState([]);
  const [training, setTraining] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, t, wf, esc] = await Promise.all([
        getDashboard(),
        getTickets(0, 20),
        getWorkflowStats().catch(() => ({ data: null })),
        getEscalationStats().catch(() => ({ data: null })),
      ]);
      setStats(s.data);
      setTickets(t.data);
      setWfStats(wf.data);
      setEscStats(esc.data);
      setError("");
    } catch {
      setError("Cannot reach backend. Make sure uvicorn is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleTrain = async () => {
    setTraining(true);
    setError("");
    try {
      await trainModels();
      await fetchAll();
    } catch (e) {
      setError(e.response?.data?.detail || "Training failed.");
    } finally {
      setTraining(false);
    }
  };

  const catData        = stats ? Object.entries(stats.category_distribution  || {}).map(([name, value]) => ({ name, value })) : [];
  const priData        = stats ? Object.entries(stats.priority_distribution   || {}).map(([name, value]) => ({ name, value })) : [];
  const sevData        = stats ? Object.entries(stats.severity_distribution   || {}).map(([name, value]) => ({ name, value })) : [];
  const trendData      = stats?.monthly_trend || [];
  const openClosedData = stats ? [
    { name: "Open",   value: stats.open   ?? 0 },
    { name: "Closed", value: stats.closed ?? 0 },
  ] : [];
  const resEscData = (wfStats && (wfStats.auto_resolved || wfStats.escalated)) ? [
    { name: "Auto-Resolved", value: wfStats.auto_resolved ?? 0 },
    { name: "Escalated",     value: wfStats.escalated     ?? 0 },
  ] : [];

  const catAcc = stats?.model_metrics?.category?.accuracy;
  const priAcc = stats?.model_metrics?.priority?.accuracy;

  if (loading) return (
    <div className="bg-gray-950 min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm animate-pulse">Loading dashboard…</div>
    </div>
  );

  return (
    <div className="bg-gray-950 min-h-screen">
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Support Analytics — real-time data from MongoDB</p>
        </div>
        <button
          onClick={handleTrain}
          disabled={training}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {training ? "Training…" : "Train / Reload Models"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Row 1 — Ticket counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Tickets"      value={stats?.total}   color="blue"   />
        <StatCard title="Open Tickets"       value={stats?.open}    color="purple" />
        <StatCard title="Closed Tickets"     value={stats?.closed}  color="green"  />
        <StatCard title="Escalated Tickets"  value={escStats?.total ?? stats?.escalated ?? "—"} color="red" />
      </div>

      {/* Row 2 — Workflow stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Auto-Resolved"      value={wfStats?.auto_resolved ?? stats?.auto_resolved ?? "—"} color="green"  />
        <StatCard title="Resolution Rate"    value={wfStats ? `${wfStats.success_rate ?? stats?.resolution_rate ?? 0}%` : (stats?.resolution_rate != null ? `${stats.resolution_rate}%` : "—")} color="green" />
        <StatCard title="Escalation Rate"    value={stats?.escalation_rate != null ? `${stats.escalation_rate}%` : "—"} color="orange" />
        <StatCard title="Workflows Run"      value={wfStats?.total ?? "—"} color="blue" />
      </div>

      {/* Row 3 — Model accuracy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Category Accuracy"  value={pct(catAcc)} color="orange" />
        <StatCard title="Priority Accuracy"  value={pct(priAcc)} color="red"    />
        <StatCard title="Critical Escalations" value={escStats?.critical ?? "—"} color="red" />
        <StatCard title="Avg Workflow Time"  value={wfStats?.avg_duration_ms ? `${(wfStats.avg_duration_ms/1000).toFixed(1)}s` : "—"} color="purple" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Tickets by Category">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catData} margin={{ left: -10, bottom: 40 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={priData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {priData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Severity Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={sevData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {sevData.map((_, i) => <Cell key={i} fill={["#ef4444","#f97316","#f59e0b","#10b981"][i % 4]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open vs Closed Tickets">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={openClosedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resEscData.length > 0 && (
          <ChartCard title="Auto-Resolved vs Escalated">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={resEscData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {trendData.length > 0 && (
          <ChartCard title="Ticket Volume Trend">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Recent Tickets */}
      <ChartCard title="Recent Tickets">
        <TicketsTable tickets={tickets} />
      </ChartCard>

    </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-400 mb-4">{title}</h2>
      {children}
    </div>
  );
}
