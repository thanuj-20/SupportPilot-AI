import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import StatCard from "../components/StatCard";
import TicketsTable from "../components/TicketsTable";
import { getDashboard, getTickets, trainModels } from "../services/api";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6"];

const pct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : "—");

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [tickets,  setTickets]  = useState([]);
  const [training, setTraining] = useState(false);
  const [error,    setError]    = useState("");

  const fetchAll = async () => {
    try {
      const [s, t] = await Promise.all([getDashboard(), getTickets(0, 20)]);
      setStats(s.data);
      setTickets(t.data);
      setError("");
    } catch {
      setError("Cannot reach backend. Make sure uvicorn is running on port 8000.");
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

  // Chart data
  const catData = stats ? Object.entries(stats.category_distribution).map(([name, value]) => ({ name, value })) : [];
  const priData = stats ? Object.entries(stats.priority_distribution).map(([name, value]) => ({ name, value })) : [];
  const sevData = stats ? Object.entries(stats.severity_distribution).map(([name, value]) => ({ name, value })) : [];
  const openClosedData = stats ? [
    { name: "Open",   value: stats.open   },
    { name: "Closed", value: stats.closed },
  ] : [];

  const catAcc = stats?.model_metrics?.category?.accuracy;
  const priAcc = stats?.model_metrics?.priority?.accuracy;

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
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

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Tickets"            value={stats?.total}   color="blue"   />
        <StatCard title="Open Tickets"             value={stats?.open}    color="purple" />
        <StatCard title="Closed Tickets"           value={stats?.closed}  color="green"  />
        <StatCard title="Category Model Accuracy"  value={pct(catAcc)}    color="orange" />
        <StatCard title="Priority Model Accuracy"  value={pct(priAcc)}    color="red"    />
      </div>

      {/* Charts Row 1 — Category + Priority */}
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
              <Pie data={priData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {priData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 — Severity + Open vs Closed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Severity Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={sevData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
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
              <Pie data={openClosedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Tickets */}
      <ChartCard title="Recent Tickets">
        <TicketsTable tickets={tickets} />
      </ChartCard>
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

